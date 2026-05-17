"""
Model Inference Module
Handles real-time predictions using trained models
"""

import numpy as np
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import joblib

logger = logging.getLogger(__name__)


class ModelInference:
    """Handles model inference and prediction"""
    
    def __init__(self):
        """Initialize inference engine"""
        self.models = {}  # zone_id -> model
        self.model_metadata = {}  # zone_id -> metadata
        self.scaler = None
    
    def load_model(self, zone_id: str, model_path: str, metadata: Dict[str, Any]) -> bool:
        """
        Load model for a zone
        
        Args:
            zone_id: Zone identifier
            model_path: Path to model file
            metadata: Model metadata
        
        Returns:
            True if successful
        """
        try:
            model = joblib.load(model_path)
            self.models[zone_id] = model
            self.model_metadata[zone_id] = metadata
            logger.info(f"Model loaded for zone {zone_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model for zone {zone_id}: {str(e)}")
            return False
    
    def predict(
        self,
        zone_id: str,
        features: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Make demand prediction for a zone
        
        Args:
            zone_id: Zone identifier
            features: Engineered features dictionary
        
        Returns:
            Prediction with confidence, intervals, and feature importance
        """
        try:
            # Get model for zone
            if zone_id not in self.models:
                logger.warning(f"No model loaded for zone {zone_id}, using baseline")
                return self._get_baseline_prediction(features, zone_id)
            
            model = self.models[zone_id]
            metadata = self.model_metadata.get(zone_id, {})
            
            # Convert features to array
            feature_array = self._features_to_array(features)
            
            # Make prediction
            if hasattr(model, 'predict_proba'):
                # For classification models (if used)
                prediction = model.predict(feature_array)[0]
            else:
                # For regression models
                prediction = model.predict([feature_array])[0]
            
            # Ensure non-negative
            prediction = max(0, float(prediction))
            
            # Calculate confidence
            confidence = self._calculate_confidence(
                prediction,
                metadata,
                features
            )
            
            # Get prediction intervals
            interval_lower, interval_upper = self._calculate_intervals(
                prediction,
                metadata
            )
            
            # Get top features (using model importance if available)
            top_features = self._get_top_features(model, features)
            
            return {
                'demand': prediction,
                'confidence': confidence,
                'interval_lower': interval_lower,
                'interval_upper': interval_upper,
                'top_features': top_features,
                'model_version': metadata.get('version', 'unknown'),
                'model_type': metadata.get('model_type', 'ensemble'),
                'prediction_timestamp': datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Prediction failed for zone {zone_id}: {str(e)}")
            return self._get_baseline_prediction(features, zone_id)
    
    def predict_batch(
        self,
        zone_id: str,
        features_list: List[Dict[str, float]]
    ) -> List[Dict[str, Any]]:
        """
        Make batch predictions
        
        Args:
            zone_id: Zone identifier
            features_list: List of feature dictionaries
        
        Returns:
            List of predictions
        """
        predictions = []
        for features in features_list:
            predictions.append(self.predict(zone_id, features))
        return predictions
    
    def _features_to_array(self, features: Dict[str, float]) -> np.ndarray:
        """Convert features dictionary to numpy array"""
        # Feature order must match training
        feature_order = [
            'hour_of_day', 'day_of_week', 'is_weekend', 'is_holiday',
            'month', 'week_of_year', 'is_peak_hour', 'season',
            'demand_7d_avg', 'demand_14d_avg', 'demand_30d_avg',
            'demand_trend', 'demand_volatility', 'day_of_week_effect',
            'hour_of_day_effect', 'seasonal_pattern',
            'active_drivers', 'driver_availability_ratio', 'current_backlog',
            'backlog_trend', 'avg_delivery_time', 'delivery_time_trend',
            'weather_condition_encoded', 'weather_severity', 'active_events',
            'event_intensity', 'zone_density', 'zone_growth_rate',
            'demand_intensity', 'delivery_pressure', 'system_stress'
        ]
        
        feature_array = []
        for feat_name in feature_order:
            feature_array.append(features.get(feat_name, 0.0))
        
        return np.array(feature_array, dtype=np.float32)
    
    def _calculate_confidence(
        self,
        prediction: float,
        metadata: Dict[str, Any],
        features: Dict[str, float]
    ) -> float:
        """Calculate confidence score for prediction"""
        confidence = 0.7  # Base confidence
        
        # Adjust based on model metrics
        if 'mae' in metadata and 'rmse' in metadata:
            # Lower error = higher confidence
            mae = metadata['mae']
            rmse = metadata['rmse']
            error_score = 1.0 - min(mae / (prediction + 1), 1.0)
            confidence = 0.5 + (error_score * 0.3)
        
        # Adjust based on data volume
        training_samples = metadata.get('training_samples', 100)
        if training_samples < 50:
            confidence *= 0.8  # Lower confidence with less data
        elif training_samples > 500:
            confidence = min(confidence + 0.1, 0.95)
        
        # Adjust based on weather severity
        weather_severity = features.get('weather_severity', 0.0)
        if weather_severity > 0.5:
            confidence *= 0.9  # Lower confidence in severe weather
        
        # Adjust based on system stress
        system_stress = features.get('system_stress', 0.0)
        if system_stress > 2.0:
            confidence *= 0.85  # Lower confidence under high stress
        
        return min(max(confidence, 0.3), 0.95)
    
    def _calculate_intervals(
        self,
        prediction: float,
        metadata: Dict[str, Any]
    ) -> tuple:
        """Calculate prediction intervals"""
        # Use residual standard deviation from training
        residual_std = metadata.get('residual_std', prediction * 0.2)
        z_score = metadata.get('z_score', 1.96)  # 95% confidence
        
        margin = z_score * residual_std
        
        interval_lower = max(0, prediction - margin)
        interval_upper = prediction + margin
        
        return float(interval_lower), float(interval_upper)
    
    def _get_top_features(
        self,
        model: Any,
        features: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Get top contributing features"""
        top_features = []
        
        try:
            # Try to get feature importance from model
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                
                feature_order = [
                    'hour_of_day', 'day_of_week', 'is_weekend', 'is_holiday',
                    'month', 'week_of_year', 'is_peak_hour', 'season',
                    'demand_7d_avg', 'demand_14d_avg', 'demand_30d_avg',
                    'demand_trend', 'demand_volatility', 'day_of_week_effect',
                    'hour_of_day_effect', 'seasonal_pattern',
                    'active_drivers', 'driver_availability_ratio', 'current_backlog',
                    'backlog_trend', 'avg_delivery_time', 'delivery_time_trend',
                    'weather_condition_encoded', 'weather_severity', 'active_events',
                    'event_intensity', 'zone_density', 'zone_growth_rate',
                    'demand_intensity', 'delivery_pressure', 'system_stress'
                ]
                
                # Create feature importance list
                feature_importance = list(zip(feature_order, importances))
                feature_importance.sort(key=lambda x: abs(x[1]), reverse=True)
                
                # Get top 5
                for feat_name, importance in feature_importance[:5]:
                    top_features.append({
                        'name': feat_name,
                        'importance': float(importance),
                        'value': features.get(feat_name, 0.0)
                    })
            else:
                # Use heuristic importance
                top_features = self._get_heuristic_features(features)
        
        except Exception as e:
            logger.warning(f"Failed to extract feature importance: {str(e)}")
            top_features = self._get_heuristic_features(features)
        
        return top_features
    
    def _get_heuristic_features(self, features: Dict[str, float]) -> List[Dict[str, Any]]:
        """Get top features using heuristic importance"""
        importance_map = {
            'hour_of_day': 0.25,
            'day_of_week': 0.15,
            'demand_7d_avg': 0.15,
            'current_backlog': 0.12,
            'active_drivers': 0.08,
            'weather_severity': 0.08,
            'demand_trend': 0.07,
            'zone_density': 0.05,
            'active_events': 0.03,
        }
        
        top_features = []
        for feat_name, importance in sorted(
            importance_map.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]:
            top_features.append({
                'name': feat_name,
                'importance': importance,
                'value': features.get(feat_name, 0.0)
            })
        
        return top_features
    
    def _get_baseline_prediction(
        self,
        features: Dict[str, float],
        zone_id: str
    ) -> Dict[str, Any]:
        """Get baseline prediction when model unavailable"""
        # Simple heuristic-based prediction
        base_demand = features.get('demand_7d_avg', 10.0)
        hour_effect = features.get('hour_of_day_effect', 1.0)
        day_effect = features.get('day_of_week_effect', 1.0)
        weather_effect = 1.0 - (features.get('weather_severity', 0.0) * 0.2)
        
        prediction = base_demand * hour_effect * day_effect * weather_effect
        prediction = max(0, float(prediction))
        
        return {
            'demand': prediction,
            'confidence': 0.5,
            'interval_lower': prediction * 0.7,
            'interval_upper': prediction * 1.3,
            'top_features': self._get_heuristic_features(features),
            'model_version': 'baseline',
            'model_type': 'heuristic',
            'prediction_timestamp': datetime.utcnow().isoformat()
        }
    
    def get_loaded_zones(self) -> List[str]:
        """Get list of zones with loaded models"""
        return list(self.models.keys())
    
    def unload_model(self, zone_id: str) -> bool:
        """Unload model for a zone"""
        try:
            if zone_id in self.models:
                del self.models[zone_id]
                del self.model_metadata[zone_id]
                logger.info(f"Model unloaded for zone {zone_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to unload model for zone {zone_id}: {str(e)}")
            return False
