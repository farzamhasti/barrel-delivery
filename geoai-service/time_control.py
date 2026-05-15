"""
Time Control System
Forecast horizon selection and time-based scenario analysis

Features:
- Multiple forecast horizons (30m, 1h, 3h, 6h, 24h)
- Time-based slicing for weekday vs weekend patterns
- Hourly demand curves
- Peak-time detection
- Business hours filtering
"""

from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
import logging

logger = logging.getLogger(__name__)


class ForecastHorizon(str, Enum):
    """Available forecast time horizons"""
    THIRTY_MIN = "30m"
    ONE_HOUR = "1h"
    THREE_HOURS = "3h"
    SIX_HOURS = "6h"
    TWENTY_FOUR_HOURS = "24h"


class DayCategory(str, Enum):
    """Day categories for temporal patterns"""
    WEEKDAY = "weekday"
    FRIDAY = "friday"
    SATURDAY = "saturday"


class PeakPeriod(str, Enum):
    """Peak period classifications"""
    EARLY_PEAK = "early_peak"      # 5-7 PM
    MAIN_PEAK = "main_peak"        # 7-9 PM
    LATE_PEAK = "late_peak"        # 9-10 PM (weekdays) or 9-11 PM (Fri/Sat)
    PRE_CLOSING = "pre_closing"    # Last 30 minutes
    OFF_HOURS = "off_hours"        # Outside operating hours


class TimeControl:
    """Manages time-based forecasting and scenario analysis"""
    
    # Operating hours configuration
    OPERATING_HOURS = {
        'weekday': {'start': 16, 'end': 22},      # 4 PM - 10 PM
        'friday': {'start': 16, 'end': 23},       # 4 PM - 11 PM
        'saturday': {'start': 16, 'end': 23},     # 4 PM - 11 PM
    }
    
    # Peak period definitions
    PEAK_PERIODS = {
        'weekday': {
            'early_peak': (17, 19),      # 5-7 PM
            'main_peak': (19, 21),       # 7-9 PM
            'late_peak': (21, 22),       # 9-10 PM
            'pre_closing': (21.5, 22),   # 9:30-10 PM
        },
        'friday': {
            'early_peak': (17, 19),      # 5-7 PM
            'main_peak': (19, 21),       # 7-9 PM
            'late_peak': (21, 23),       # 9-11 PM
            'pre_closing': (22.5, 23),   # 10:30-11 PM
        },
        'saturday': {
            'early_peak': (17, 19),      # 5-7 PM
            'main_peak': (19, 21),       # 7-9 PM
            'late_peak': (21, 23),       # 9-11 PM
            'pre_closing': (22.5, 23),   # 10:30-11 PM
        },
    }
    
    def __init__(self):
        """Initialize time control system"""
        self.current_timestamp = datetime.utcnow()
    
    def get_day_category(self, date: Optional[datetime] = None) -> DayCategory:
        """
        Determine day category (weekday/Friday/Saturday)
        
        Args:
            date: Date to categorize (default: current date)
        
        Returns:
            DayCategory enum value
        """
        if date is None:
            date = datetime.utcnow()
        
        day_of_week = date.weekday()
        
        if day_of_week == 4:  # Friday
            return DayCategory.FRIDAY
        elif day_of_week == 5:  # Saturday
            return DayCategory.SATURDAY
        else:
            return DayCategory.WEEKDAY
    
    def is_operating_hours(
        self,
        date: Optional[datetime] = None
    ) -> bool:
        """
        Check if current/given time is within operating hours
        
        Args:
            date: Date to check (default: current date)
        
        Returns:
            True if within operating hours, False otherwise
        """
        if date is None:
            date = datetime.utcnow()
        
        day_category = self.get_day_category(date)
        day_key = day_category.value
        
        hours = self.OPERATING_HOURS.get(day_key, self.OPERATING_HOURS['weekday'])
        hour = date.hour
        
        return hours['start'] <= hour < hours['end']
    
    def get_operating_hours(self, day_category: Optional[DayCategory] = None) -> Tuple[int, int]:
        """
        Get operating hours for a day category
        
        Args:
            day_category: Day category (default: current day)
        
        Returns:
            Tuple of (start_hour, end_hour)
        """
        if day_category is None:
            day_category = self.get_day_category()
        
        day_key = day_category.value
        hours = self.OPERATING_HOURS.get(day_key, self.OPERATING_HOURS['weekday'])
        
        return (hours['start'], hours['end'])
    
    def get_peak_period(
        self,
        date: Optional[datetime] = None
    ) -> PeakPeriod:
        """
        Determine current peak period
        
        Args:
            date: Date to check (default: current date)
        
        Returns:
            PeakPeriod enum value
        """
        if date is None:
            date = datetime.utcnow()
        
        if not self.is_operating_hours(date):
            return PeakPeriod.OFF_HOURS
        
        day_category = self.get_day_category(date)
        day_key = day_category.value
        hour = date.hour + date.minute / 60.0
        
        peak_defs = self.PEAK_PERIODS.get(day_key, self.PEAK_PERIODS['weekday'])
        
        # Check each peak period
        for period_name, (start, end) in peak_defs.items():
            if start <= hour < end:
                return PeakPeriod(period_name)
        
        return PeakPeriod.OFF_HOURS
    
    def get_demand_multiplier(self, peak_period: PeakPeriod) -> float:
        """
        Get demand multiplier for a peak period
        
        Args:
            peak_period: Peak period classification
        
        Returns:
            Demand multiplier (1.0 = baseline)
        """
        multipliers = {
            PeakPeriod.EARLY_PEAK: 0.6,
            PeakPeriod.MAIN_PEAK: 0.9,
            PeakPeriod.LATE_PEAK: 0.8,
            PeakPeriod.PRE_CLOSING: 0.85,
            PeakPeriod.OFF_HOURS: 0.0,
        }
        return multipliers.get(peak_period, 0.0)
    
    def get_forecast_timestamps(
        self,
        horizon: ForecastHorizon,
        start_time: Optional[datetime] = None,
        interval_minutes: int = 15
    ) -> List[datetime]:
        """
        Generate forecast timestamps for a given horizon
        
        Args:
            horizon: Forecast horizon
            start_time: Start time (default: current time)
            interval_minutes: Interval between timestamps
        
        Returns:
            List of timestamps within the forecast horizon
        """
        if start_time is None:
            start_time = datetime.utcnow()
        
        # Map horizon to minutes
        horizon_minutes = {
            ForecastHorizon.THIRTY_MIN: 30,
            ForecastHorizon.ONE_HOUR: 60,
            ForecastHorizon.THREE_HOURS: 180,
            ForecastHorizon.SIX_HOURS: 360,
            ForecastHorizon.TWENTY_FOUR_HOURS: 1440,
        }
        
        total_minutes = horizon_minutes.get(horizon, 60)
        timestamps = []
        
        current = start_time
        end_time = start_time + timedelta(minutes=total_minutes)
        
        while current <= end_time:
            # Only include timestamps within operating hours
            if self.is_operating_hours(current):
                timestamps.append(current)
            current += timedelta(minutes=interval_minutes)
        
        return timestamps
    
    def get_hourly_demand_curve(
        self,
        day_category: Optional[DayCategory] = None
    ) -> Dict[int, float]:
        """
        Get typical hourly demand curve for a day category
        
        Args:
            day_category: Day category (default: current day)
        
        Returns:
            Dictionary mapping hour to demand multiplier
        """
        if day_category is None:
            day_category = self.get_day_category()
        
        # Typical demand curves (0-1 scale)
        curves = {
            'weekday': {
                16: 0.3,   # 4 PM
                17: 0.6,   # 5 PM
                18: 0.7,   # 6 PM
                19: 0.9,   # 7 PM (main peak starts)
                20: 0.95,  # 8 PM (peak)
                21: 0.8,   # 9 PM (late peak)
            },
            'friday': {
                16: 0.4,   # 4 PM
                17: 0.7,   # 5 PM
                18: 0.8,   # 6 PM
                19: 0.95,  # 7 PM (main peak)
                20: 1.0,   # 8 PM (peak)
                21: 0.9,   # 9 PM (late peak)
                22: 0.7,   # 10 PM (extended hours)
            },
            'saturday': {
                16: 0.4,   # 4 PM
                17: 0.7,   # 5 PM
                18: 0.8,   # 6 PM
                19: 0.95,  # 7 PM (main peak)
                20: 1.0,   # 8 PM (peak)
                21: 0.9,   # 9 PM (late peak)
                22: 0.7,   # 10 PM (extended hours)
            },
        }
        
        day_key = day_category.value
        return curves.get(day_key, curves['weekday'])
    
    def get_scenario_forecast(
        self,
        base_demand: float,
        horizon: ForecastHorizon,
        scenario: str = "normal"
    ) -> Dict[str, float]:
        """
        Generate scenario-based forecast
        
        Args:
            base_demand: Base demand level
            horizon: Forecast horizon
            scenario: Scenario type (normal, surge, shortage)
        
        Returns:
            Dictionary with forecast data
        """
        timestamps = self.get_forecast_timestamps(horizon)
        
        if not timestamps:
            return {
                'scenario': scenario,
                'base_demand': base_demand,
                'forecast_points': [],
                'average_demand': 0,
                'peak_demand': 0,
            }
        
        forecast_points = []
        demands = []
        
        for ts in timestamps:
            peak_period = self.get_peak_period(ts)
            multiplier = self.get_demand_multiplier(peak_period)
            
            # Apply scenario modifier
            scenario_modifier = {
                'normal': 1.0,
                'surge': 1.5,
                'shortage': 0.7,
            }.get(scenario, 1.0)
            
            demand = base_demand * multiplier * scenario_modifier
            demands.append(demand)
            
            forecast_points.append({
                'timestamp': ts.isoformat(),
                'demand': float(demand),
                'peak_period': peak_period.value,
            })
        
        return {
            'scenario': scenario,
            'base_demand': base_demand,
            'forecast_points': forecast_points,
            'average_demand': float(np.mean(demands)) if demands else 0,
            'peak_demand': float(np.max(demands)) if demands else 0,
            'min_demand': float(np.min(demands)) if demands else 0,
        }
    
    def get_time_until_peak(
        self,
        date: Optional[datetime] = None
    ) -> Optional[Dict[str, any]]:
        """
        Calculate time until next peak period
        
        Args:
            date: Reference date (default: current date)
        
        Returns:
            Dictionary with peak info or None if no peak today
        """
        if date is None:
            date = datetime.utcnow()
        
        day_category = self.get_day_category(date)
        day_key = day_category.value
        peak_defs = self.PEAK_PERIODS.get(day_key, self.PEAK_PERIODS['weekday'])
        
        current_hour = date.hour + date.minute / 60.0
        
        # Find next peak period
        for period_name in ['early_peak', 'main_peak', 'late_peak']:
            start, end = peak_defs[period_name]
            if current_hour < start:
                minutes_until = int((start - current_hour) * 60)
                return {
                    'peak_period': period_name,
                    'minutes_until': minutes_until,
                    'start_time': (date.replace(minute=0, second=0, microsecond=0) + 
                                  timedelta(hours=start - date.hour)).isoformat(),
                }
        
        return None
    
    def get_time_until_close(
        self,
        date: Optional[datetime] = None
    ) -> Optional[int]:
        """
        Calculate minutes until closing
        
        Args:
            date: Reference date (default: current date)
        
        Returns:
            Minutes until close, or None if already closed
        """
        if date is None:
            date = datetime.utcnow()
        
        if not self.is_operating_hours(date):
            return None
        
        day_category = self.get_day_category(date)
        day_key = day_category.value
        hours = self.OPERATING_HOURS.get(day_key, self.OPERATING_HOURS['weekday'])
        
        current_hour = date.hour + date.minute / 60.0
        closing_hour = hours['end']
        
        minutes_until = int((closing_hour - current_hour) * 60)
        return max(0, minutes_until)


# Singleton instance
_time_control = None


def get_time_control() -> TimeControl:
    """Get or create time control instance"""
    global _time_control
    if _time_control is None:
        _time_control = TimeControl()
    return _time_control
