"""
Feature Engineering Module
Transforms raw data into ML-ready features
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
import logging

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """Handles feature engineering for demand forecasting"""
    
    def __init__(self):
        """Initialize feature engineer"""
        self.feature_names = self._get_feature_names()
        self.scaler_params = {}
    
    def _get_feature_names(self) -> List[str]:
        """Get list of all feature names"""
        return [
            # Temporal features
            'hour_of_day', 'day_of_week', 'is_weekend', 'is_holiday',
            'month', 'week_of_year', 'is_peak_hour', 'season',
            
            # Historical demand features
            'demand_7d_avg', 'demand_14d_avg', 'demand_30d_avg',
            'demand_trend', 'demand_volatility', 'day_of_week_effect',
            'hour_of_day_effect', 'seasonal_pattern',
            
            # Operational features
            'active_drivers', 'driver_availability_ratio', 'current_backlog',
            'backlog_trend', 'avg_delivery_time', 'delivery_time_trend',
            
            # External features
            'weather_condition_encoded', 'weather_severity', 'active_events',
            'event_intensity', 'zone_density', 'zone_growth_rate',
            
            # Derived features
            'demand_intensity', 'delivery_pressure', 'system_stress'
        ]
    
    def engineer_features(
        self,
        zone_id: str,
        forecast_time: datetime,
        active_drivers: Optional[int] = None,
        current_backlog: Optional[int] = None,
        weather_condition: Optional[str] = None,
        weather_severity: Optional[float] = None,
        active_events: Optional[int] = None,
        event_intensity: Optional[float] = None,
        zone_density: Optional[float] = None,
        historical_data: Optional[pd.DataFrame] = None
    ) -> Dict[str, float]:
        """
        Engineer features for a prediction
        
        Args:
            zone_id: Delivery zone identifier
            forecast_time: Time to forecast for
            active_drivers: Number of active drivers
            current_backlog: Current order backlog
            weather_condition: Weather condition (clear, rain, snow, etc)
            weather_severity: Weather severity (0-1)
            active_events: Number of active events
            event_intensity: Event intensity (0-1)
            zone_density: Orders per km²
            historical_data: Historical order data for this zone
        
        Returns:
            Dictionary of engineered features
        """
        features = {}
        
        # ====================================================================
        # Temporal Features
        # ====================================================================
        features.update(self._engineer_temporal_features(forecast_time))
        
        # ====================================================================
        # Historical Demand Features
        # ====================================================================
        if historical_data is not None and len(historical_data) > 0:
            features.update(
                self._engineer_demand_features(forecast_time, historical_data)
            )
        else:
            # Use defaults if no historical data
            features.update(self._get_default_demand_features())
        
        # ====================================================================
        # Operational Features
        # ====================================================================
        features['active_drivers'] = active_drivers or 5
        features['driver_availability_ratio'] = min(
            (active_drivers or 5) / 10, 1.0
        )
        features['current_backlog'] = current_backlog or 0
        features['backlog_trend'] = 0.0  # Would be calculated from history
        features['avg_delivery_time'] = 25.0  # Default
        features['delivery_time_trend'] = 0.0
        
        # ====================================================================
        # External Features
        # ====================================================================
        features['weather_condition_encoded'] = self._encode_weather(
            weather_condition or 'clear'
        )
        features['weather_severity'] = weather_severity or 0.0
        features['active_events'] = active_events or 0
        features['event_intensity'] = event_intensity or 0.0
        features['zone_density'] = zone_density or 5.0
        features['zone_growth_rate'] = 0.02  # Default 2% growth
        
        # ====================================================================
        # Derived Features
        # ====================================================================
        features.update(self._engineer_derived_features(features))
        
        return features
    
    def _engineer_temporal_features(self, forecast_time: datetime) -> Dict[str, float]:
        """Engineer temporal features"""
        features = {}
        
        features['hour_of_day'] = float(forecast_time.hour)
        features['day_of_week'] = float(forecast_time.weekday())
        features['is_weekend'] = float(forecast_time.weekday() >= 5)
        features['is_holiday'] = 0.0  # Would check holiday calendar
        features['month'] = float(forecast_time.month)
        features['week_of_year'] = float(forecast_time.isocalendar()[1])
        
        # Peak hours: 11-13 (lunch), 17-19 (dinner)
        is_peak = (11 <= forecast_time.hour <= 13) or (17 <= forecast_time.hour <= 19)
        features['is_peak_hour'] = float(is_peak)
        
        # Season: 0=winter, 1=spring, 2=summer, 3=fall
        month = forecast_time.month
        if month in [12, 1, 2]:
            features['season'] = 0.0
        elif month in [3, 4, 5]:
            features['season'] = 1.0
        elif month in [6, 7, 8]:
            features['season'] = 2.0
        else:
            features['season'] = 3.0
        
        return features
    
    def _engineer_demand_features(
        self,
        forecast_time: datetime,
        historical_data: pd.DataFrame
    ) -> Dict[str, float]:
        """Engineer demand-based features from historical data"""
        features = {}
        
        try:
            # Filter historical data
            if 'created_at' in historical_data.columns:
                historical_data['created_at'] = pd.to_datetime(
                    historical_data['created_at']
                )
                
                # 7-day average
                cutoff_7d = forecast_time - timedelta(days=7)
                data_7d = historical_data[
                    historical_data['created_at'] >= cutoff_7d
                ]
                features['demand_7d_avg'] = float(
                    len(data_7d) / 7 if len(data_7d) > 0 else 10.0
                )
                
                # 14-day average
                cutoff_14d = forecast_time - timedelta(days=14)
                data_14d = historical_data[
                    historical_data['created_at'] >= cutoff_14d
                ]
                features['demand_14d_avg'] = float(
                    len(data_14d) / 14 if len(data_14d) > 0 else 10.0
                )
                
                # 30-day average
                cutoff_30d = forecast_time - timedelta(days=30)
                data_30d = historical_data[
                    historical_data['created_at'] >= cutoff_30d
                ]
                features['demand_30d_avg'] = float(
                    len(data_30d) / 30 if len(data_30d) > 0 else 10.0
                )
                
                # Trend (linear regression slope)
                if len(data_30d) > 1:
                    daily_counts = data_30d.groupby(
                        data_30d['created_at'].dt.date
                    ).size()
                    x = np.arange(len(daily_counts))
                    y = daily_counts.values
                    if len(x) > 1:
                        slope = np.polyfit(x, y, 1)[0]
                        features['demand_trend'] = float(slope)
                    else:
                        features['demand_trend'] = 0.0
                else:
                    features['demand_trend'] = 0.0
                
                # Volatility (standard deviation)
                if len(data_30d) > 0:
                    daily_counts = data_30d.groupby(
                        data_30d['created_at'].dt.date
                    ).size()
                    features['demand_volatility'] = float(
                        daily_counts.std() / (daily_counts.mean() + 1)
                    )
                else:
                    features['demand_volatility'] = 0.1
            else:
                features.update(self._get_default_demand_features())
        
        except Exception as e:
            logger.warning(f"Error engineering demand features: {str(e)}")
            features.update(self._get_default_demand_features())
        
        # Day-of-week and hour-of-day effects
        features['day_of_week_effect'] = self._get_day_of_week_effect(
            forecast_time.weekday()
        )
        features['hour_of_day_effect'] = self._get_hour_of_day_effect(
            forecast_time.hour
        )
        features['seasonal_pattern'] = self._get_seasonal_pattern(
            forecast_time.month
        )
        
        return features
    
    def _get_default_demand_features(self) -> Dict[str, float]:
        """Get default demand features when historical data unavailable"""
        return {
            'demand_7d_avg': 10.0,
            'demand_14d_avg': 10.0,
            'demand_30d_avg': 10.0,
            'demand_trend': 0.0,
            'demand_volatility': 0.1,
        }
    
    def _get_day_of_week_effect(self, day_of_week: int) -> float:
        """Get day-of-week multiplier"""
        # Monday=0, Sunday=6
        effects = [0.9, 0.85, 0.8, 0.85, 1.0, 1.15, 1.2]
        return float(effects[day_of_week])
    
    def _get_hour_of_day_effect(self, hour: int) -> float:
        """Get hour-of-day multiplier"""
        # Higher demand during meal times
        if 11 <= hour <= 13:  # Lunch
            return 1.3
        elif 17 <= hour <= 19:  # Dinner
            return 1.4
        elif 8 <= hour <= 10:  # Breakfast
            return 0.8
        elif 20 <= hour <= 22:  # Late night
            return 0.9
        else:  # Off-hours
            return 0.5
    
    def _get_seasonal_pattern(self, month: int) -> float:
        """Get seasonal multiplier"""
        # Higher demand in summer and holidays
        if month in [6, 7, 8]:  # Summer
            return 1.15
        elif month in [11, 12]:  # Holiday season
            return 1.2
        elif month in [1, 2]:  # Post-holiday
            return 0.9
        else:
            return 1.0
    
    def _encode_weather(self, weather_condition: str) -> float:
        """Encode weather condition as numeric value"""
        encoding = {
            'clear': 0.0,
            'cloudy': 0.2,
            'rain': 0.5,
            'heavy_rain': 0.7,
            'snow': 0.6,
            'fog': 0.3,
            'storm': 0.8
        }
        return encoding.get(weather_condition.lower(), 0.0)
    
    def _engineer_derived_features(self, features: Dict[str, float]) -> Dict[str, float]:
        """Engineer derived features from base features"""
        derived = {}
        
        # Demand intensity (normalized 0-1)
        avg_demand = (
            features.get('demand_7d_avg', 10) +
            features.get('demand_14d_avg', 10) +
            features.get('demand_30d_avg', 10)
        ) / 3
        derived['demand_intensity'] = min(avg_demand / 30, 1.0)
        
        # Delivery pressure (backlog / drivers)
        drivers = max(features.get('active_drivers', 1), 1)
        backlog = features.get('current_backlog', 0)
        derived['delivery_pressure'] = backlog / drivers
        
        # System stress (backlog * delivery_time)
        delivery_time = features.get('avg_delivery_time', 25)
        derived['system_stress'] = backlog * delivery_time / 100
        
        return derived
    
    def get_feature_names(self) -> List[str]:
        """Get list of all feature names"""
        return self.feature_names
    
    def get_feature_importance_baseline(self) -> Dict[str, float]:
        """Get baseline feature importance (used before SHAP)"""
        return {
            'hour_of_day': 0.25,
            'day_of_week': 0.15,
            'demand_7d_avg': 0.15,
            'current_backlog': 0.12,
            'active_drivers': 0.08,
            'weather_severity': 0.08,
            'demand_trend': 0.07,
            'zone_density': 0.05,
            'active_events': 0.03,
            'other': 0.02
        }
