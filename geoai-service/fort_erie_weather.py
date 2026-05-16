"""
Fort Erie Weather Intelligence System
Real-time weather data integration with demand correlation learning
Location: Fort Erie, Ontario, Canada (42.8900°N, 79.0000°W)
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Tuple
import json
from collections import defaultdict

# Fort Erie exact coordinates
FORT_ERIE_LATITUDE = 42.8900
FORT_ERIE_LONGITUDE = -79.0000
FORT_ERIE_LOCATION = "Fort Erie, Ontario, Canada"

class WeatherCondition(Enum):
    """Weather condition classifications for Fort Erie"""
    CLEAR = "clear"
    PARTLY_CLOUDY = "partly_cloudy"
    CLOUDY = "cloudy"
    LIGHT_RAIN = "light_rain"
    MODERATE_RAIN = "moderate_rain"
    HEAVY_RAIN = "heavy_rain"
    LIGHT_SNOW = "light_snow"
    MODERATE_SNOW = "moderate_snow"
    HEAVY_SNOW = "heavy_snow"
    THUNDERSTORM = "thunderstorm"
    FOG = "fog"
    WINDY = "windy"

class WeatherSeverity(Enum):
    """Weather severity levels for operational impact"""
    CLEAR = "clear"
    MODERATE = "moderate"
    SEVERE = "severe"
    EXTREME = "extreme"

@dataclass
class FortErieWeatherData:
    """Real-time weather data for Fort Erie"""
    timestamp: datetime
    location: str = FORT_ERIE_LOCATION
    latitude: float = FORT_ERIE_LATITUDE
    longitude: float = FORT_ERIE_LONGITUDE
    
    # Temperature (Celsius)
    temperature: float = 0.0
    feels_like: float = 0.0
    
    # Precipitation
    precipitation_mm: float = 0.0  # Current precipitation
    precipitation_probability: float = 0.0  # Probability (0-100)
    
    # Snowfall
    snowfall_mm: float = 0.0
    snow_depth_cm: float = 0.0
    
    # Wind
    wind_speed_kmh: float = 0.0
    wind_direction_degrees: float = 0.0
    wind_gust_kmh: float = 0.0
    
    # Atmospheric
    humidity_percent: float = 0.0
    pressure_mb: float = 1013.0
    visibility_km: float = 10.0
    
    # Condition
    condition: WeatherCondition = WeatherCondition.CLEAR
    severity: WeatherSeverity = WeatherSeverity.CLEAR
    
    # Data quality
    is_valid: bool = True
    data_source: str = "Environment Canada / Weather API"
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class WeatherDemandCorrelation:
    """Weather-demand correlation data"""
    weather_condition: WeatherCondition
    avg_demand_multiplier: float  # 1.0 = baseline, 1.5 = 50% increase
    avg_delay_multiplier: float  # 1.0 = baseline, 1.3 = 30% increase
    avg_driver_efficiency: float  # 0.0-1.0, 1.0 = 100% efficiency
    confidence: float  # 0.0-1.0
    sample_count: int = 0

class FortErieWeatherIntelligence:
    """
    Fort Erie-specific weather intelligence system
    Learns weather-demand correlations and provides operational impact assessment
    """
    
    def __init__(self):
        self.current_weather: Optional[FortErieWeatherData] = None
        self.weather_history: List[FortErieWeatherData] = []
        self.demand_history: List[Dict] = []  # {timestamp, demand, weather_condition}
        self.delay_history: List[Dict] = []  # {timestamp, delay_minutes, weather_condition}
        
        # Weather-demand correlations (learned from data)
        self.correlations: Dict[WeatherCondition, WeatherDemandCorrelation] = {}
        self._initialize_default_correlations()
        
        # Weather impact cache
        self.impact_cache: Dict[str, any] = {}
        self.last_impact_update: Optional[datetime] = None
    
    def _initialize_default_correlations(self):
        """Initialize default weather-demand correlations for Fort Erie"""
        # Based on typical delivery patterns in Ontario
        self.correlations = {
            WeatherCondition.CLEAR: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.CLEAR,
                avg_demand_multiplier=1.0,
                avg_delay_multiplier=1.0,
                avg_driver_efficiency=1.0,
                confidence=0.95
            ),
            WeatherCondition.PARTLY_CLOUDY: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.PARTLY_CLOUDY,
                avg_demand_multiplier=1.05,
                avg_delay_multiplier=1.0,
                avg_driver_efficiency=0.98,
                confidence=0.90
            ),
            WeatherCondition.CLOUDY: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.CLOUDY,
                avg_demand_multiplier=1.08,
                avg_delay_multiplier=1.05,
                avg_driver_efficiency=0.95,
                confidence=0.85
            ),
            WeatherCondition.LIGHT_RAIN: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.LIGHT_RAIN,
                avg_demand_multiplier=1.25,
                avg_delay_multiplier=1.15,
                avg_driver_efficiency=0.85,
                confidence=0.88
            ),
            WeatherCondition.MODERATE_RAIN: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.MODERATE_RAIN,
                avg_demand_multiplier=1.45,
                avg_delay_multiplier=1.35,
                avg_driver_efficiency=0.70,
                confidence=0.90
            ),
            WeatherCondition.HEAVY_RAIN: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.HEAVY_RAIN,
                avg_demand_multiplier=1.65,
                avg_delay_multiplier=1.60,
                avg_driver_efficiency=0.55,
                confidence=0.92
            ),
            WeatherCondition.LIGHT_SNOW: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.LIGHT_SNOW,
                avg_demand_multiplier=1.35,
                avg_delay_multiplier=1.40,
                avg_driver_efficiency=0.75,
                confidence=0.85
            ),
            WeatherCondition.MODERATE_SNOW: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.MODERATE_SNOW,
                avg_demand_multiplier=1.55,
                avg_delay_multiplier=1.70,
                avg_driver_efficiency=0.60,
                confidence=0.88
            ),
            WeatherCondition.HEAVY_SNOW: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.HEAVY_SNOW,
                avg_demand_multiplier=1.75,
                avg_delay_multiplier=2.00,
                avg_driver_efficiency=0.40,
                confidence=0.90
            ),
            WeatherCondition.THUNDERSTORM: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.THUNDERSTORM,
                avg_demand_multiplier=1.50,
                avg_delay_multiplier=1.80,
                avg_driver_efficiency=0.50,
                confidence=0.87
            ),
            WeatherCondition.FOG: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.FOG,
                avg_demand_multiplier=1.10,
                avg_delay_multiplier=1.25,
                avg_driver_efficiency=0.80,
                confidence=0.80
            ),
            WeatherCondition.WINDY: WeatherDemandCorrelation(
                weather_condition=WeatherCondition.WINDY,
                avg_demand_multiplier=1.05,
                avg_delay_multiplier=1.10,
                avg_driver_efficiency=0.90,
                confidence=0.75
            ),
        }
    
    def update_weather(self, weather_data: FortErieWeatherData) -> None:
        """Update current weather for Fort Erie"""
        # Validate location
        if not self._validate_fort_erie_location(weather_data):
            weather_data.is_valid = False
            return
        
        self.current_weather = weather_data
        self.weather_history.append(weather_data)
        
        # Keep only last 30 days of history
        cutoff_time = datetime.now() - timedelta(days=30)
        self.weather_history = [w for w in self.weather_history if w.timestamp > cutoff_time]
        
        # Invalidate impact cache
        self.last_impact_update = None
    
    def _validate_fort_erie_location(self, weather_data: FortErieWeatherData) -> bool:
        """Validate that weather data is actually for Fort Erie"""
        # Check coordinates are within Fort Erie area (±0.05 degrees)
        lat_valid = abs(weather_data.latitude - FORT_ERIE_LATITUDE) < 0.05
        lng_valid = abs(weather_data.longitude - FORT_ERIE_LONGITUDE) < 0.05
        
        return lat_valid and lng_valid
    
    def get_weather_severity(self) -> WeatherSeverity:
        """Get current weather severity level"""
        if not self.current_weather:
            return WeatherSeverity.CLEAR
        
        return self.current_weather.severity
    
    def get_demand_multiplier(self) -> float:
        """Get weather-based demand multiplier for Fort Erie"""
        if not self.current_weather or not self.current_weather.is_valid:
            return 1.0
        
        condition = self.current_weather.condition
        if condition in self.correlations:
            return self.correlations[condition].avg_demand_multiplier
        
        return 1.0
    
    def get_delay_multiplier(self) -> float:
        """Get weather-based delay multiplier for Fort Erie"""
        if not self.current_weather or not self.current_weather.is_valid:
            return 1.0
        
        condition = self.current_weather.condition
        if condition in self.correlations:
            return self.correlations[condition].avg_delay_multiplier
        
        return 1.0
    
    def get_driver_efficiency(self) -> float:
        """Get weather-based driver efficiency (0.0-1.0)"""
        if not self.current_weather or not self.current_weather.is_valid:
            return 1.0
        
        condition = self.current_weather.condition
        if condition in self.correlations:
            return self.correlations[condition].avg_driver_efficiency
        
        return 1.0
    
    def calculate_weather_impact_score(self) -> float:
        """
        Calculate overall weather impact score (0-100)
        0 = no impact, 100 = extreme impact
        """
        if not self.current_weather or not self.current_weather.is_valid:
            return 0.0
        
        # Base impact from condition
        condition = self.current_weather.condition
        if condition in self.correlations:
            # Convert multipliers to impact score
            demand_impact = (self.correlations[condition].avg_demand_multiplier - 1.0) * 30
            delay_impact = (self.correlations[condition].avg_delay_multiplier - 1.0) * 40
            efficiency_impact = (1.0 - self.correlations[condition].avg_driver_efficiency) * 30
            
            impact_score = demand_impact + delay_impact + efficiency_impact
            return min(100.0, max(0.0, impact_score))
        
        return 0.0
    
    def learn_weather_demand_correlation(self, weather_condition: WeatherCondition, 
                                        demand: int, delay_minutes: float) -> None:
        """Learn weather-demand correlation from actual data"""
        if weather_condition not in self.correlations:
            return
        
        correlation = self.correlations[weather_condition]
        
        # Update multipliers based on observed data
        # This is a simplified learning mechanism
        baseline_demand = 30  # Baseline orders
        baseline_delay = 20   # Baseline delay in minutes
        
        observed_demand_multiplier = demand / baseline_demand
        observed_delay_multiplier = delay_minutes / baseline_delay
        
        # Exponential moving average (alpha = 0.1)
        alpha = 0.1
        correlation.avg_demand_multiplier = (
            (1 - alpha) * correlation.avg_demand_multiplier + 
            alpha * observed_demand_multiplier
        )
        correlation.avg_delay_multiplier = (
            (1 - alpha) * correlation.avg_delay_multiplier + 
            alpha * observed_delay_multiplier
        )
        
        correlation.sample_count += 1
        
        # Increase confidence with more samples
        correlation.confidence = min(0.99, 0.5 + (correlation.sample_count / 100))
    
    def get_weather_operational_recommendations(self) -> List[str]:
        """Generate operational recommendations based on current weather"""
        if not self.current_weather or not self.current_weather.is_valid:
            return []
        
        recommendations = []
        condition = self.current_weather.condition
        
        # Temperature-based recommendations
        if self.current_weather.temperature < -10:
            recommendations.append("Extreme cold: Increase driver breaks and vehicle checks")
        elif self.current_weather.temperature < 0:
            recommendations.append("Below freezing: Monitor road conditions and driver safety")
        elif self.current_weather.temperature > 30:
            recommendations.append("High heat: Ensure driver hydration and vehicle cooling")
        
        # Precipitation-based recommendations
        if self.current_weather.precipitation_mm > 10:
            recommendations.append("Heavy precipitation: Expect significant delivery delays")
        elif self.current_weather.precipitation_mm > 5:
            recommendations.append("Moderate precipitation: Plan for increased delivery times")
        
        # Snowfall-based recommendations
        if self.current_weather.snowfall_mm > 10:
            recommendations.append("Heavy snowfall: Increase driver count and extend delivery windows")
        elif self.current_weather.snowfall_mm > 5:
            recommendations.append("Moderate snowfall: Monitor road conditions closely")
        
        # Wind-based recommendations
        if self.current_weather.wind_gust_kmh > 50:
            recommendations.append("High wind gusts: Advise drivers of hazardous conditions")
        
        # Visibility-based recommendations
        if self.current_weather.visibility_km < 1:
            recommendations.append("Low visibility: Reduce delivery radius and increase caution")
        
        return recommendations
    
    def get_fort_erie_weather_summary(self) -> Dict:
        """Get comprehensive Fort Erie weather summary"""
        if not self.current_weather:
            return {
                "status": "No weather data available",
                "location": FORT_ERIE_LOCATION,
                "coordinates": {"latitude": FORT_ERIE_LATITUDE, "longitude": FORT_ERIE_LONGITUDE}
            }
        
        return {
            "location": FORT_ERIE_LOCATION,
            "coordinates": {
                "latitude": self.current_weather.latitude,
                "longitude": self.current_weather.longitude
            },
            "timestamp": self.current_weather.timestamp.isoformat(),
            "temperature": {
                "current": self.current_weather.temperature,
                "feels_like": self.current_weather.feels_like,
                "unit": "Celsius"
            },
            "precipitation": {
                "amount_mm": self.current_weather.precipitation_mm,
                "probability_percent": self.current_weather.precipitation_probability,
                "snowfall_mm": self.current_weather.snowfall_mm
            },
            "wind": {
                "speed_kmh": self.current_weather.wind_speed_kmh,
                "direction_degrees": self.current_weather.wind_direction_degrees,
                "gust_kmh": self.current_weather.wind_gust_kmh
            },
            "atmospheric": {
                "humidity_percent": self.current_weather.humidity_percent,
                "pressure_mb": self.current_weather.pressure_mb,
                "visibility_km": self.current_weather.visibility_km
            },
            "condition": self.current_weather.condition.value,
            "severity": self.current_weather.severity.value,
            "impact_score": self.calculate_weather_impact_score(),
            "demand_multiplier": self.get_demand_multiplier(),
            "delay_multiplier": self.get_delay_multiplier(),
            "driver_efficiency": self.get_driver_efficiency(),
            "recommendations": self.get_weather_operational_recommendations(),
            "data_source": self.current_weather.data_source,
            "is_valid": self.current_weather.is_valid
        }
