"""
Alert System
Real-time AI alerts for operational intelligence

Features:
- Demand surge warnings
- Driver shortage risk alerts
- Delay probability alerts
- Event-driven demand spike alerts
- Alert severity classification
- Alert deduplication
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from enum import Enum
import logging
import uuid

logger = logging.getLogger(__name__)


class AlertType(str, Enum):
    """Types of alerts"""
    DEMAND_SURGE = "demand_surge"
    DRIVER_SHORTAGE = "driver_shortage"
    DELAY_PROBABILITY = "delay_probability"
    EVENT_SPIKE = "event_spike"
    WEATHER_IMPACT = "weather_impact"
    ZONE_OVERLOAD = "zone_overload"
    OPERATIONAL_RISK = "operational_risk"


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertStatus(str, Enum):
    """Alert status"""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


@dataclass
class Alert:
    """Represents an operational alert"""
    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    title: str
    message: str
    details: Dict
    timestamp: datetime
    status: AlertStatus = AlertStatus.ACTIVE
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    expiry_time: Optional[datetime] = None
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'alert_id': self.alert_id,
            'alert_type': self.alert_type.value,
            'severity': self.severity.value,
            'title': self.title,
            'message': self.message,
            'details': self.details,
            'timestamp': self.timestamp.isoformat(),
            'status': self.status.value,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'acknowledged_by': self.acknowledged_by,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'expiry_time': self.expiry_time.isoformat() if self.expiry_time else None,
        }
    
    def is_expired(self) -> bool:
        """Check if alert has expired"""
        if self.expiry_time is None:
            return False
        return datetime.utcnow() > self.expiry_time


class AlertSystem:
    """Manages real-time alerts"""
    
    # Alert expiry times (in minutes)
    EXPIRY_TIMES = {
        AlertType.DEMAND_SURGE: 30,
        AlertType.DRIVER_SHORTAGE: 20,
        AlertType.DELAY_PROBABILITY: 15,
        AlertType.EVENT_SPIKE: 60,
        AlertType.WEATHER_IMPACT: 120,
        AlertType.ZONE_OVERLOAD: 25,
        AlertType.OPERATIONAL_RISK: 45,
    }
    
    # Deduplication window (in minutes)
    DEDUP_WINDOW = 10
    
    def __init__(self):
        """Initialize alert system"""
        self.alerts: List[Alert] = []
        self.alert_history: List[Alert] = []
        self.recent_alerts: Set[str] = set()  # For deduplication
    
    def create_demand_surge_alert(
        self,
        current_demand: float,
        predicted_demand: float,
        surge_probability: float,
        affected_zones: int
    ) -> Alert:
        """Create demand surge alert"""
        severity = self._calculate_severity_from_probability(surge_probability)
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            alert_type=AlertType.DEMAND_SURGE,
            severity=severity,
            title="Demand Surge Detected",
            message=f"Demand surge expected: {predicted_demand:.0f} (current: {current_demand:.0f})",
            details={
                'current_demand': current_demand,
                'predicted_demand': predicted_demand,
                'demand_increase': predicted_demand - current_demand,
                'surge_probability': surge_probability,
                'affected_zones': affected_zones,
            },
            timestamp=datetime.utcnow(),
            expiry_time=datetime.utcnow() + timedelta(
                minutes=self.EXPIRY_TIMES[AlertType.DEMAND_SURGE]
            ),
        )
        
        return self._add_alert(alert)
    
    def create_driver_shortage_alert(
        self,
        required_drivers: int,
        available_drivers: int,
        shortage_percentage: float
    ) -> Alert:
        """Create driver shortage alert"""
        severity = AlertSeverity.CRITICAL if shortage_percentage > 50 else AlertSeverity.HIGH
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            alert_type=AlertType.DRIVER_SHORTAGE,
            severity=severity,
            title="Driver Shortage Risk",
            message=f"Driver shortage: {available_drivers}/{required_drivers} available",
            details={
                'required_drivers': required_drivers,
                'available_drivers': available_drivers,
                'shortage_count': required_drivers - available_drivers,
                'shortage_percentage': shortage_percentage,
            },
            timestamp=datetime.utcnow(),
            expiry_time=datetime.utcnow() + timedelta(
                minutes=self.EXPIRY_TIMES[AlertType.DRIVER_SHORTAGE]
            ),
        )
        
        return self._add_alert(alert)
    
    def create_delay_probability_alert(
        self,
        delay_probability: float,
        average_delay_minutes: float,
        affected_orders: int
    ) -> Alert:
        """Create delay probability alert"""
        severity = AlertSeverity.HIGH if delay_probability > 0.7 else AlertSeverity.MEDIUM
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            alert_type=AlertType.DELAY_PROBABILITY,
            severity=severity,
            title="High Delay Probability",
            message=f"Delay probability: {delay_probability*100:.0f}% - avg delay: {average_delay_minutes:.0f} min",
            details={
                'delay_probability': delay_probability,
                'average_delay_minutes': average_delay_minutes,
                'affected_orders': affected_orders,
            },
            timestamp=datetime.utcnow(),
            expiry_time=datetime.utcnow() + timedelta(
                minutes=self.EXPIRY_TIMES[AlertType.DELAY_PROBABILITY]
            ),
        )
        
        return self._add_alert(alert)
    
    def create_event_spike_alert(
        self,
        event_name: str,
        event_type: str,
        expected_impact: float,
        predicted_demand_increase: float
    ) -> Alert:
        """Create event-driven demand spike alert"""
        severity = AlertSeverity.HIGH if expected_impact > 0.8 else AlertSeverity.MEDIUM
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            alert_type=AlertType.EVENT_SPIKE,
            severity=severity,
            title=f"Event-Driven Demand Spike: {event_name}",
            message=f"Event '{event_name}' expected to increase demand by {predicted_demand_increase*100:.0f}%",
            details={
                'event_name': event_name,
                'event_type': event_type,
                'expected_impact': expected_impact,
                'predicted_demand_increase': predicted_demand_increase,
            },
            timestamp=datetime.utcnow(),
            expiry_time=datetime.utcnow() + timedelta(
                minutes=self.EXPIRY_TIMES[AlertType.EVENT_SPIKE]
            ),
        )
        
        return self._add_alert(alert)
    
    def create_weather_impact_alert(
        self,
        weather_condition: str,
        impact_multiplier: float,
        affected_areas: int
    ) -> Alert:
        """Create weather impact alert"""
        severity = AlertSeverity.MEDIUM if impact_multiplier > 1.3 else AlertSeverity.LOW
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            alert_type=AlertType.WEATHER_IMPACT,
            severity=severity,
            title=f"Weather Impact: {weather_condition}",
            message=f"Weather condition '{weather_condition}' expected to increase demand by {(impact_multiplier-1)*100:.0f}%",
            details={
                'weather_condition': weather_condition,
                'impact_multiplier': impact_multiplier,
                'affected_areas': affected_areas,
            },
            timestamp=datetime.utcnow(),
            expiry_time=datetime.utcnow() + timedelta(
                minutes=self.EXPIRY_TIMES[AlertType.WEATHER_IMPACT]
            ),
        )
        
        return self._add_alert(alert)
    
    def create_zone_overload_alert(
        self,
        zone_id: str,
        zone_name: str,
        utilization_percentage: float,
        current_orders: int,
        capacity: int
    ) -> Alert:
        """Create zone overload alert"""
        severity = AlertSeverity.CRITICAL if utilization_percentage > 90 else AlertSeverity.HIGH
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            alert_type=AlertType.ZONE_OVERLOAD,
            severity=severity,
            title=f"Zone Overload: {zone_name}",
            message=f"Zone '{zone_name}' at {utilization_percentage:.0f}% capacity ({current_orders}/{capacity} orders)",
            details={
                'zone_id': zone_id,
                'zone_name': zone_name,
                'utilization_percentage': utilization_percentage,
                'current_orders': current_orders,
                'capacity': capacity,
            },
            timestamp=datetime.utcnow(),
            expiry_time=datetime.utcnow() + timedelta(
                minutes=self.EXPIRY_TIMES[AlertType.ZONE_OVERLOAD]
            ),
        )
        
        return self._add_alert(alert)
    
    def create_operational_risk_alert(
        self,
        risk_type: str,
        risk_level: str,
        description: str,
        recommended_action: str
    ) -> Alert:
        """Create operational risk alert"""
        severity_map = {
            'critical': AlertSeverity.CRITICAL,
            'high': AlertSeverity.HIGH,
            'medium': AlertSeverity.MEDIUM,
            'low': AlertSeverity.LOW,
        }
        severity = severity_map.get(risk_level, AlertSeverity.MEDIUM)
        
        alert = Alert(
            alert_id=str(uuid.uuid4()),
            alert_type=AlertType.OPERATIONAL_RISK,
            severity=severity,
            title=f"Operational Risk: {risk_type}",
            message=description,
            details={
                'risk_type': risk_type,
                'risk_level': risk_level,
                'recommended_action': recommended_action,
            },
            timestamp=datetime.utcnow(),
            expiry_time=datetime.utcnow() + timedelta(
                minutes=self.EXPIRY_TIMES[AlertType.OPERATIONAL_RISK]
            ),
        )
        
        return self._add_alert(alert)
    
    def _add_alert(self, alert: Alert) -> Alert:
        """Add alert with deduplication"""
        # Check for duplicate alerts
        if self._is_duplicate(alert):
            logger.info(f"Alert deduplicated: {alert.alert_type.value}")
            return alert
        
        self.alerts.append(alert)
        self.alert_history.append(alert)
        self.recent_alerts.add(alert.alert_id)
        
        logger.info(f"Alert created: {alert.alert_type.value} - {alert.severity.value}")
        return alert
    
    def _is_duplicate(self, alert: Alert) -> bool:
        """Check if alert is a duplicate (within dedup window)"""
        cutoff_time = datetime.utcnow() - timedelta(minutes=self.DEDUP_WINDOW)
        
        for existing_alert in self.alerts:
            if (existing_alert.alert_type == alert.alert_type and
                existing_alert.timestamp > cutoff_time and
                existing_alert.status != AlertStatus.RESOLVED):
                return True
        
        return False
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> Optional[Alert]:
        """Acknowledge an alert"""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.status = AlertStatus.ACKNOWLEDGED
                alert.acknowledged_at = datetime.utcnow()
                alert.acknowledged_by = acknowledged_by
                logger.info(f"Alert acknowledged: {alert_id} by {acknowledged_by}")
                return alert
        return None
    
    def resolve_alert(self, alert_id: str) -> Optional[Alert]:
        """Resolve an alert"""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.status = AlertStatus.RESOLVED
                alert.resolved_at = datetime.utcnow()
                logger.info(f"Alert resolved: {alert_id}")
                return alert
        return None
    
    def dismiss_alert(self, alert_id: str) -> Optional[Alert]:
        """Dismiss an alert"""
        for alert in self.alerts:
            if alert.alert_id == alert_id:
                alert.status = AlertStatus.DISMISSED
                logger.info(f"Alert dismissed: {alert_id}")
                return alert
        return None
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts"""
        active = [
            alert for alert in self.alerts
            if alert.status == AlertStatus.ACTIVE and not alert.is_expired()
        ]
        return sorted(active, key=lambda a: self._severity_order(a.severity), reverse=True)
    
    def get_alerts_by_severity(self, severity: AlertSeverity) -> List[Alert]:
        """Get alerts by severity"""
        return [
            alert for alert in self.get_active_alerts()
            if alert.severity == severity
        ]
    
    def get_alerts_by_type(self, alert_type: AlertType) -> List[Alert]:
        """Get alerts by type"""
        return [
            alert for alert in self.get_active_alerts()
            if alert.alert_type == alert_type
        ]
    
    def cleanup_expired_alerts(self):
        """Remove expired alerts"""
        before_count = len(self.alerts)
        self.alerts = [alert for alert in self.alerts if not alert.is_expired()]
        after_count = len(self.alerts)
        
        if before_count > after_count:
            logger.info(f"Cleaned up {before_count - after_count} expired alerts")
    
    def get_alerts_summary(self) -> Dict:
        """Get summary of current alerts"""
        active = self.get_active_alerts()
        
        severity_counts = {
            AlertSeverity.CRITICAL: len(self.get_alerts_by_severity(AlertSeverity.CRITICAL)),
            AlertSeverity.HIGH: len(self.get_alerts_by_severity(AlertSeverity.HIGH)),
            AlertSeverity.MEDIUM: len(self.get_alerts_by_severity(AlertSeverity.MEDIUM)),
            AlertSeverity.LOW: len(self.get_alerts_by_severity(AlertSeverity.LOW)),
            AlertSeverity.INFO: len(self.get_alerts_by_severity(AlertSeverity.INFO)),
        }
        
        type_counts = {}
        for alert_type in AlertType:
            count = len(self.get_alerts_by_type(alert_type))
            if count > 0:
                type_counts[alert_type.value] = count
        
        return {
            'total_active_alerts': len(active),
            'severity_breakdown': {k.value: v for k, v in severity_counts.items()},
            'type_breakdown': type_counts,
            'total_history': len(self.alert_history),
        }
    
    def get_alerts_dict(self) -> List[Dict]:
        """Get all active alerts as dictionaries"""
        return [alert.to_dict() for alert in self.get_active_alerts()]
    
    def _severity_order(self, severity: AlertSeverity) -> int:
        """Get numeric order for severity (higher = more severe)"""
        order = {
            AlertSeverity.CRITICAL: 5,
            AlertSeverity.HIGH: 4,
            AlertSeverity.MEDIUM: 3,
            AlertSeverity.LOW: 2,
            AlertSeverity.INFO: 1,
        }
        return order.get(severity, 0)
    
    def _calculate_severity_from_probability(self, probability: float) -> AlertSeverity:
        """Calculate severity from probability (0-1)"""
        if probability > 0.8:
            return AlertSeverity.CRITICAL
        elif probability > 0.7:
            return AlertSeverity.HIGH
        elif probability > 0.5:
            return AlertSeverity.MEDIUM
        elif probability > 0.3:
            return AlertSeverity.LOW
        else:
            return AlertSeverity.INFO


# Singleton instance
_alert_system = None


def get_alert_system() -> AlertSystem:
    """Get or create alert system instance"""
    global _alert_system
    if _alert_system is None:
        _alert_system = AlertSystem()
    return _alert_system
