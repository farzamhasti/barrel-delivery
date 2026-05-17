"""
Explainability Module
Generates human-readable explanations for predictions using SHAP
"""

import logging
from typing import Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)


class ExplainabilityEngine:
    """Generates explanations for ML predictions"""
    
    def __init__(self):
        """Initialize explainability engine"""
        self.feature_descriptions = self._get_feature_descriptions()
        self.explanation_templates = self._get_explanation_templates()
    
    def generate_explanation(
        self,
        prediction: Dict[str, Any],
        features: Dict[str, float],
        zone_id: str = "unknown"
    ) -> str:
        """
        Generate human-readable explanation for a prediction
        
        Args:
            prediction: Prediction result with top_features
            features: Input features
            zone_id: Zone identifier
        
        Returns:
            Human-readable explanation string
        """
        try:
            demand = prediction.get('demand', 0)
            confidence = prediction.get('confidence', 0)
            top_features = prediction.get('top_features', [])
            
            # Build explanation
            explanation_parts = []
            
            # Main prediction
            explanation_parts.append(
                self._explain_demand_level(demand, features)
            )
            
            # Top contributing factors
            if top_features:
                explanation_parts.append(
                    self._explain_top_factors(top_features, features)
                )
            
            # Confidence explanation
            explanation_parts.append(
                self._explain_confidence(confidence, features)
            )
            
            # Combine parts
            explanation = " ".join(explanation_parts)
            
            return explanation
        
        except Exception as e:
            logger.error(f"Failed to generate explanation: {str(e)}")
            return "Unable to generate explanation for this prediction."
    
    def _explain_demand_level(
        self,
        demand: float,
        features: Dict[str, float]
    ) -> str:
        """Explain the demand level"""
        # Get baseline demand
        baseline = features.get('demand_7d_avg', 10.0)
        
        if demand > baseline * 1.3:
            return f"Demand is expected to be HIGH ({demand:.1f} orders), significantly above the 7-day average of {baseline:.1f}."
        elif demand > baseline * 1.1:
            return f"Demand is expected to be ELEVATED ({demand:.1f} orders), moderately above the 7-day average of {baseline:.1f}."
        elif demand < baseline * 0.7:
            return f"Demand is expected to be LOW ({demand:.1f} orders), significantly below the 7-day average of {baseline:.1f}."
        elif demand < baseline * 0.9:
            return f"Demand is expected to be REDUCED ({demand:.1f} orders), moderately below the 7-day average of {baseline:.1f}."
        else:
            return f"Demand is expected to be NORMAL ({demand:.1f} orders), in line with the 7-day average of {baseline:.1f}."
    
    def _explain_top_factors(
        self,
        top_features: List[Dict[str, Any]],
        features: Dict[str, float]
    ) -> str:
        """Explain top contributing factors"""
        if not top_features:
            return ""
        
        factors = []
        
        for feature in top_features[:3]:  # Top 3 factors
            feat_name = feature.get('name', '')
            importance = feature.get('importance', 0)
            value = feature.get('value', 0)
            
            explanation = self._explain_feature_impact(
                feat_name, value, importance, features
            )
            if explanation:
                factors.append(explanation)
        
        if factors:
            return "Key factors: " + " ".join(factors)
        return ""
    
    def _explain_feature_impact(
        self,
        feature_name: str,
        value: float,
        importance: float,
        features: Dict[str, float]
    ) -> str:
        """Explain impact of a specific feature"""
        
        if feature_name == 'hour_of_day':
            hour = int(value)
            if 11 <= hour <= 13:
                return f"lunch hour ({hour}:00) driving high demand"
            elif 17 <= hour <= 19:
                return f"dinner hour ({hour}:00) driving high demand"
            elif 8 <= hour <= 10:
                return f"breakfast hour ({hour}:00) with moderate demand"
            else:
                return f"off-peak hour ({hour}:00) with lower demand"
        
        elif feature_name == 'day_of_week':
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            day = int(value) % 7
            day_name = day_names[day]
            if day >= 5:
                return f"{day_name} weekend effect boosting demand"
            else:
                return f"{day_name} weekday pattern"
        
        elif feature_name == 'current_backlog':
            if value > 10:
                return f"high backlog ({int(value)} orders) indicating system stress"
            elif value > 5:
                return f"moderate backlog ({int(value)} orders) affecting delivery times"
            else:
                return f"low backlog ({int(value)} orders) enabling faster service"
        
        elif feature_name == 'active_drivers':
            if value < 3:
                return f"limited driver availability ({int(value)} drivers) constraining capacity"
            elif value > 8:
                return f"good driver availability ({int(value)} drivers) supporting high demand"
            else:
                return f"adequate driver availability ({int(value)} drivers)"
        
        elif feature_name == 'weather_severity':
            if value > 0.5:
                return f"severe weather conditions ({value:.1%}) reducing demand"
            elif value > 0.2:
                return f"moderate weather impact ({value:.1%})"
            else:
                return f"clear weather conditions"
        
        elif feature_name == 'demand_trend':
            if value > 0.5:
                return f"strong upward demand trend"
            elif value < -0.5:
                return f"declining demand trend"
            else:
                return f"stable demand pattern"
        
        elif feature_name == 'zone_density':
            if value > 8:
                return f"high zone density ({value:.1f} orders/km²) indicating concentrated demand"
            elif value < 3:
                return f"low zone density ({value:.1f} orders/km²)"
            else:
                return f"moderate zone density ({value:.1f} orders/km²)"
        
        elif feature_name == 'active_events':
            if value > 0:
                return f"{int(value)} active event(s) driving additional demand"
            else:
                return ""
        
        else:
            # Generic explanation
            if importance > 0.15:
                return f"{self.feature_descriptions.get(feature_name, feature_name)} is a major factor"
            else:
                return ""
    
    def _explain_confidence(
        self,
        confidence: float,
        features: Dict[str, float]
    ) -> str:
        """Explain confidence level"""
        if confidence > 0.85:
            return f"High confidence ({confidence:.0%}) in this prediction based on consistent historical patterns."
        elif confidence > 0.70:
            return f"Good confidence ({confidence:.0%}) with some variability in historical data."
        elif confidence > 0.55:
            return f"Moderate confidence ({confidence:.0%}) due to unusual conditions or limited historical data."
        else:
            return f"Low confidence ({confidence:.0%}) - use with caution due to high uncertainty."
    
    def _get_feature_descriptions(self) -> Dict[str, str]:
        """Get human-readable descriptions of features"""
        return {
            'hour_of_day': 'Time of day',
            'day_of_week': 'Day of week',
            'is_weekend': 'Weekend flag',
            'is_holiday': 'Holiday flag',
            'month': 'Month',
            'week_of_year': 'Week of year',
            'is_peak_hour': 'Peak hour',
            'season': 'Season',
            'demand_7d_avg': '7-day average demand',
            'demand_14d_avg': '14-day average demand',
            'demand_30d_avg': '30-day average demand',
            'demand_trend': 'Demand trend',
            'demand_volatility': 'Demand volatility',
            'day_of_week_effect': 'Day-of-week effect',
            'hour_of_day_effect': 'Hour-of-day effect',
            'seasonal_pattern': 'Seasonal pattern',
            'active_drivers': 'Active drivers',
            'driver_availability_ratio': 'Driver availability',
            'current_backlog': 'Current backlog',
            'backlog_trend': 'Backlog trend',
            'avg_delivery_time': 'Average delivery time',
            'delivery_time_trend': 'Delivery time trend',
            'weather_condition_encoded': 'Weather condition',
            'weather_severity': 'Weather severity',
            'active_events': 'Active events',
            'event_intensity': 'Event intensity',
            'zone_density': 'Zone density',
            'zone_growth_rate': 'Zone growth rate',
            'demand_intensity': 'Demand intensity',
            'delivery_pressure': 'Delivery pressure',
            'system_stress': 'System stress'
        }
    
    def _get_explanation_templates(self) -> Dict[str, str]:
        """Get explanation templates"""
        return {
            'high_demand': "Demand is expected to be HIGH due to {factors}.",
            'low_demand': "Demand is expected to be LOW due to {factors}.",
            'normal_demand': "Demand is expected to be NORMAL with {factors}.",
            'confidence_high': "High confidence in this prediction ({confidence:.0%}).",
            'confidence_low': "Low confidence in this prediction ({confidence:.0%}).",
        }
    
    def get_shap_explanation(
        self,
        model: Any,
        features: np.ndarray,
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """
        Generate SHAP-based explanation (requires shap library)
        
        Args:
            model: Trained model
            features: Feature array
            feature_names: Feature names
        
        Returns:
            SHAP explanation dictionary
        """
        try:
            import shap
            
            # Create explainer
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(features)
            
            # Get base value
            base_value = explainer.expected_value
            
            # Create explanation
            explanation = {
                'base_value': float(base_value),
                'shap_values': shap_values.tolist() if hasattr(shap_values, 'tolist') else shap_values,
                'feature_names': feature_names,
                'features': features.tolist() if hasattr(features, 'tolist') else features
            }
            
            return explanation
        
        except ImportError:
            logger.warning("SHAP library not available, using fallback explanation")
            return {}
        except Exception as e:
            logger.error(f"SHAP explanation failed: {str(e)}")
            return {}
    
    def get_feature_importance_summary(
        self,
        model: Any,
        feature_names: List[str],
        top_n: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get feature importance summary
        
        Args:
            model: Trained model
            feature_names: Feature names
            top_n: Number of top features to return
        
        Returns:
            List of feature importance dictionaries
        """
        try:
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                
                # Create feature importance list
                feature_importance = list(zip(feature_names, importances))
                feature_importance.sort(key=lambda x: abs(x[1]), reverse=True)
                
                # Get top N
                result = []
                for feat_name, importance in feature_importance[:top_n]:
                    result.append({
                        'feature': feat_name,
                        'importance': float(importance),
                        'rank': len(result) + 1
                    })
                
                return result
            else:
                logger.warning("Model does not support feature importance")
                return []
        
        except Exception as e:
            logger.error(f"Failed to get feature importance: {str(e)}")
            return []
