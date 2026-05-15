"""
Event & Weather Intelligence Layer
Integrates free/public data sources for demand correlation analysis

Features:
- Weather conditions (rain, snow, temperature)
- Sports events (NHL, CFL, NFL)
- Holidays and local events
- Demand correlation learning
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from enum import Enum
import logging
import json

logger = logging.getLogger(__name__)


class WeatherCondition(str, Enum):
    """Weather condition classifications"""
    CLEAR = "clear"
    CLOUDY = "cloudy"
    RAINY = "rainy"
    SNOWY = "snowy"
    STORMY = "stormy"
    FOGGY = "foggy"


class EventType(str, Enum):
    """Event type classifications"""
    SPORTS = "sports"
    HOLIDAY = "holiday"
    LOCAL_EVENT = "local_event"
    CONCERT = "concert"
    FESTIVAL = "festival"


class SportLeague(str, Enum):
    """Sports leagues"""
    NHL = "nhl"
    NFL = "nfl"
    CFL = "cfl"
    NBA = "nba"
    MLB = "mlb"


class WeatherData:
    """Weather data container"""
    
    def __init__(
        self,
        condition: WeatherCondition,
        temperature_c: float,
        precipitation_mm: float,
        wind_speed_kmh: float,
        timestamp: datetime
    ):
        self.condition = condition
        self.temperature_c = temperature_c
        self.precipitation_mm = precipitation_mm
        self.wind_speed_kmh = wind_speed_kmh
        self.timestamp = timestamp
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'condition': self.condition.value,
            'temperature_c': self.temperature_c,
            'precipitation_mm': self.precipitation_mm,
            'wind_speed_kmh': self.wind_speed_kmh,
            'timestamp': self.timestamp.isoformat(),
        }


class EventData:
    """Event data container"""
    
    def __init__(
        self,
        event_id: str,
        event_type: EventType,
        name: str,
        date: datetime,
        location: Optional[str] = None,
        league: Optional[SportLeague] = None,
        expected_impact: str = "moderate"
    ):
        self.event_id = event_id
        self.event_type = event_type
        self.name = name
        self.date = date
        self.location = location
        self.league = league
        self.expected_impact = expected_impact
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'event_id': self.event_id,
            'event_type': self.event_type.value,
            'name': self.name,
            'date': self.date.isoformat(),
            'location': self.location,
            'league': self.league.value if self.league else None,
            'expected_impact': self.expected_impact,
        }


class EventWeatherIntelligence:
    """Manages event and weather intelligence"""
    
    # Weather impact on demand (multiplier)
    WEATHER_IMPACT = {
        WeatherCondition.CLEAR: 0.9,      # Slightly lower (people go out)
        WeatherCondition.CLOUDY: 1.0,     # Normal
        WeatherCondition.RAINY: 1.3,      # Higher (people stay in)
        WeatherCondition.SNOWY: 1.4,      # Higher (people stay in)
        WeatherCondition.STORMY: 1.5,     # Much higher (people stay in)
        WeatherCondition.FOGGY: 1.1,      # Slightly higher
    }
    
    # Sports event impact on demand
    SPORTS_IMPACT = {
        SportLeague.NHL: 1.2,    # Moderate impact
        SportLeague.NFL: 1.3,    # Moderate-high impact
        SportLeague.CFL: 1.2,    # Moderate impact
        SportLeague.NBA: 1.1,    # Low-moderate impact
        SportLeague.MLB: 1.1,    # Low-moderate impact
    }
    
    # Holiday impact on demand
    HOLIDAY_IMPACT = 1.4  # Higher demand on holidays
    
    # Local event impact on demand
    LOCAL_EVENT_IMPACT = 1.3
    
    # Canadian holidays 2026
    CANADIAN_HOLIDAYS = {
        (1, 1): "New Year's Day",
        (2, 16): "Family Day",
        (4, 5): "Easter",
        (5, 18): "Victoria Day",
        (7, 1): "Canada Day",
        (8, 3): "Civic Holiday",
        (9, 7): "Labour Day",
        (9, 28): "National Day for Truth and Reconciliation",
        (10, 12): "Thanksgiving",
        (12, 25): "Christmas Day",
        (12, 26): "Boxing Day",
    }
    
    # Ontario holidays 2026
    ONTARIO_HOLIDAYS = {
        (1, 1): "New Year's Day",
        (2, 16): "Family Day",
        (4, 5): "Easter",
        (5, 18): "Victoria Day",
        (7, 1): "Canada Day",
        (8, 3): "Civic Holiday",
        (9, 7): "Labour Day",
        (9, 28): "National Day for Truth and Reconciliation",
        (10, 12): "Thanksgiving",
        (12, 25): "Christmas Day",
        (12, 26): "Boxing Day",
    }
    
    # Fort Erie local events (sample)
    LOCAL_EVENTS = [
        {
            'date': (7, 1),
            'name': 'Canada Day Celebrations',
            'impact': 'high'
        },
        {
            'date': (8, 15),
            'name': 'Fort Erie Summer Festival',
            'impact': 'high'
        },
        {
            'date': (10, 31),
            'name': 'Halloween',
            'impact': 'moderate'
        },
    ]
    
    def __init__(self):
        """Initialize event/weather intelligence"""
        self.weather_history: List[WeatherData] = []
        self.event_history: List[EventData] = []
        self.correlations: Dict[str, float] = {}
    
    def add_weather_data(self, weather: WeatherData):
        """Add weather data point"""
        self.weather_history.append(weather)
        logger.info(f"Added weather data: {weather.condition.value}")
    
    def add_event(self, event: EventData):
        """Add event"""
        self.event_history.append(event)
        logger.info(f"Added event: {event.name}")
    
    def get_weather_impact(self, condition: WeatherCondition) -> float:
        """Get demand multiplier for weather condition"""
        return self.WEATHER_IMPACT.get(condition, 1.0)
    
    def get_sports_impact(self, league: SportLeague) -> float:
        """Get demand multiplier for sports event"""
        return self.SPORTS_IMPACT.get(league, 1.0)
    
    def is_holiday(self, date: datetime) -> Tuple[bool, Optional[str]]:
        """
        Check if date is a holiday
        
        Returns:
            Tuple of (is_holiday, holiday_name)
        """
        month_day = (date.month, date.day)
        
        # Check Canadian holidays
        if month_day in self.CANADIAN_HOLIDAYS:
            return True, self.CANADIAN_HOLIDAYS[month_day]
        
        # Check Ontario holidays
        if month_day in self.ONTARIO_HOLIDAYS:
            return True, self.ONTARIO_HOLIDAYS[month_day]
        
        return False, None
    
    def get_local_events(self, date: datetime) -> List[Dict]:
        """Get local events for a date"""
        month_day = (date.month, date.day)
        events = []
        
        for event in self.LOCAL_EVENTS:
            if event['date'] == month_day:
                events.append(event)
        
        return events
    
    def calculate_demand_adjustment(
        self,
        base_demand: float,
        weather: Optional[WeatherData] = None,
        events: Optional[List[EventData]] = None,
        date: Optional[datetime] = None
    ) -> Tuple[float, Dict[str, any]]:
        """
        Calculate adjusted demand based on weather and events
        
        Args:
            base_demand: Base demand level
            weather: Weather data (optional)
            events: List of events (optional)
            date: Date to check for holidays (optional)
        
        Returns:
            Tuple of (adjusted_demand, adjustment_details)
        """
        adjustments = {
            'weather': 1.0,
            'holiday': 1.0,
            'sports': 1.0,
            'local_events': 1.0,
            'total_multiplier': 1.0,
        }
        
        # Weather adjustment
        if weather:
            adjustments['weather'] = self.get_weather_impact(weather.condition)
        
        # Holiday adjustment
        if date:
            is_holiday, holiday_name = self.is_holiday(date)
            if is_holiday:
                adjustments['holiday'] = self.HOLIDAY_IMPACT
                adjustments['holiday_name'] = holiday_name
        
        # Sports event adjustment
        if events:
            max_sports_impact = 1.0
            for event in events:
                if event.event_type == EventType.SPORTS and event.league:
                    impact = self.get_sports_impact(event.league)
                    max_sports_impact = max(max_sports_impact, impact)
            adjustments['sports'] = max_sports_impact
        
        # Local events adjustment
        if date:
            local_events = self.get_local_events(date)
            if local_events:
                # Use highest impact local event
                max_local_impact = 1.0
                for event in local_events:
                    if event['impact'] == 'high':
                        max_local_impact = max(max_local_impact, self.LOCAL_EVENT_IMPACT)
                    elif event['impact'] == 'moderate':
                        max_local_impact = max(max_local_impact, 1.2)
                adjustments['local_events'] = max_local_impact
        
        # Calculate total multiplier
        total_multiplier = (
            adjustments['weather'] *
            adjustments['holiday'] *
            adjustments['sports'] *
            adjustments['local_events']
        )
        adjustments['total_multiplier'] = total_multiplier
        
        # Apply adjustment to demand
        adjusted_demand = base_demand * total_multiplier
        
        return adjusted_demand, adjustments
    
    def get_upcoming_events(
        self,
        days_ahead: int = 7,
        start_date: Optional[datetime] = None
    ) -> List[Dict]:
        """Get upcoming events"""
        if start_date is None:
            start_date = datetime.utcnow()
        
        upcoming = []
        
        for i in range(days_ahead):
            check_date = start_date + timedelta(days=i)
            
            # Check holidays
            is_holiday, holiday_name = self.is_holiday(check_date)
            if is_holiday:
                upcoming.append({
                    'date': check_date.isoformat(),
                    'type': 'holiday',
                    'name': holiday_name,
                    'impact': 'high',
                })
            
            # Check local events
            local_events = self.get_local_events(check_date)
            for event in local_events:
                upcoming.append({
                    'date': check_date.isoformat(),
                    'type': 'local_event',
                    'name': event['name'],
                    'impact': event['impact'],
                })
        
        return upcoming
    
    def learn_correlations(
        self,
        weather_data: List[WeatherData],
        demand_data: List[float]
    ) -> Dict[str, float]:
        """
        Learn correlations between weather and demand
        
        Args:
            weather_data: List of weather data points
            demand_data: List of corresponding demand values
        
        Returns:
            Dictionary of correlations
        """
        if not weather_data or not demand_data or len(weather_data) != len(demand_data):
            return {}
        
        try:
            # Calculate correlation for each weather condition
            correlations = {}
            
            for condition in WeatherCondition:
                condition_demands = [
                    demand for weather, demand in zip(weather_data, demand_data)
                    if weather.condition == condition
                ]
                
                if condition_demands:
                    avg_demand = sum(condition_demands) / len(condition_demands)
                    overall_avg = sum(demand_data) / len(demand_data)
                    
                    # Simple correlation: ratio of average demand to overall average
                    correlation = avg_demand / overall_avg if overall_avg > 0 else 1.0
                    correlations[condition.value] = correlation
            
            self.correlations = correlations
            logger.info(f"Learned weather correlations: {correlations}")
            return correlations
        
        except Exception as e:
            logger.error(f"Error learning correlations: {e}")
            return {}
    
    def get_weather_forecast_impact(
        self,
        forecast_days: int = 7
    ) -> Dict[str, any]:
        """
        Get weather forecast impact on demand
        
        Args:
            forecast_days: Number of days to forecast
        
        Returns:
            Dictionary with forecast impact data
        """
        # In production, this would call a real weather API
        # For now, return sample data
        
        forecast = {
            'forecast_days': forecast_days,
            'weather_conditions': [],
            'demand_impacts': [],
        }
        
        for i in range(forecast_days):
            date = datetime.utcnow() + timedelta(days=i)
            
            # Sample weather conditions (in production, from API)
            conditions = [
                WeatherCondition.CLEAR,
                WeatherCondition.CLOUDY,
                WeatherCondition.RAINY,
                WeatherCondition.SNOWY,
            ]
            condition = conditions[i % len(conditions)]
            
            impact = self.get_weather_impact(condition)
            
            forecast['weather_conditions'].append({
                'date': date.isoformat(),
                'condition': condition.value,
                'impact_multiplier': impact,
            })
        
        return forecast
    
    def get_event_impact_summary(self) -> Dict[str, any]:
        """Get summary of event impacts"""
        return {
            'total_events': len(self.event_history),
            'sports_events': len([e for e in self.event_history if e.event_type == EventType.SPORTS]),
            'holidays': len([e for e in self.event_history if e.event_type == EventType.HOLIDAY]),
            'local_events': len([e for e in self.event_history if e.event_type == EventType.LOCAL_EVENT]),
            'weather_history_points': len(self.weather_history),
            'correlations': self.correlations,
        }


# Singleton instance
_event_weather_intelligence = None


def get_event_weather_intelligence() -> EventWeatherIntelligence:
    """Get or create event/weather intelligence instance"""
    global _event_weather_intelligence
    if _event_weather_intelligence is None:
        _event_weather_intelligence = EventWeatherIntelligence()
    return _event_weather_intelligence
