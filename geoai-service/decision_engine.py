"""
Decision Engine & Recommendations
Converts predictions into actionable decisions

Features:
- Driver allocation recommendations
- Zone rebalancing suggestions
- Delivery radius adjustment
- Demand surge preparation
- Confidence scoring
- Expected impact calculation
"""

from dataclasses import dataclass
from typing import Dict, List, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class RecommendationType(str, Enum):
    """Types of recommendations"""
    ADD_DRIVERS = "add_drivers"
    REMOVE_DRIVERS = "remove_drivers"
    REBALANCE_ZONES = "rebalance_zones"
    REDUCE_RADIUS = "reduce_radius"
    EXPAND_RADIUS = "expand_radius"
    PREPARE_SURGE = "prepare_surge"
    REDUCE_OPERATIONS = "reduce_operations"


class UrgencyLevel(str, Enum):
    """Urgency levels for recommendations"""
    CRITICAL = "critical"
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"
    MINIMAL = "minimal"


class ExpectedImpact(str, Enum):
    """Expected impact levels"""
    SIGNIFICANT = "significant"
    MODERATE = "moderate"
    MINIMAL = "minimal"


@dataclass
class Recommendation:
    """Represents an operational recommendation"""
    recommendation_id: str
    recommendation_type: RecommendationType
    title: str
    description: str
    reason: str
    action_items: List[str]
    confidence_score: float  # 0-1
    expected_impact: ExpectedImpact
    urgency_level: UrgencyLevel
    estimated_effect: Dict[str, any]
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'recommendation_id': self.recommendation_id,
            'recommendation_type': self.recommendation_type.value,
            'title': self.title,
            'description': self.description,
            'reason': self.reason,
            'action_items': self.action_items,
            'confidence_score': self.confidence_score,
            'expected_impact': self.expected_impact.value,
            'urgency_level': self.urgency_level.value,
            'estimated_effect': self.estimated_effect,
        }


class DecisionEngine:
    """Generates operational recommendations"""
    
    def __init__(self):
        """Initialize decision engine"""
        self.recommendations: List[Recommendation] = []
        self.recommendation_counter = 0
    
    def generate_recommendations(
        self,
        current_demand: float,
        predicted_demand: float,
        active_drivers: int,
        available_zones: int,
        surge_probability: float,
        current_orders: int = 0,
        average_delivery_time: float = 0,
        driver_utilization: float = 0.7
    ) -> List[Recommendation]:
        """
        Generate recommendations based on current and predicted state
        
        Args:
            current_demand: Current demand level (0-100)
            predicted_demand: Predicted demand level (0-100)
            active_drivers: Number of active drivers
            available_zones: Number of delivery zones
            surge_probability: Probability of demand surge (0-1)
            current_orders: Current number of orders
            average_delivery_time: Average delivery time in minutes
            driver_utilization: Driver utilization rate (0-1)
        
        Returns:
            List of recommendations
        """
        self.recommendations = []
        
        # Calculate demand change
        demand_change = predicted_demand - current_demand
        demand_change_pct = (demand_change / current_demand * 100) if current_demand > 0 else 0
        
        # Driver allocation recommendations
        if demand_change > 30:
            self._add_driver_recommendation(
                demand_change, predicted_demand, active_drivers, surge_probability
            )
        elif demand_change < -30:
            self._remove_driver_recommendation(
                demand_change, predicted_demand, active_drivers
            )
        
        # Zone rebalancing
        if surge_probability > 0.7:
            self._add_zone_rebalancing_recommendation(
                predicted_demand, available_zones, surge_probability
            )
        
        # Delivery radius adjustment
        if predicted_demand > 80:
            self._add_radius_reduction_recommendation(predicted_demand)
        elif predicted_demand < 40 and average_delivery_time > 30:
            self._add_radius_expansion_recommendation(predicted_demand)
        
        # Surge preparation
        if surge_probability > 0.6:
            self._add_surge_preparation_recommendation(
                predicted_demand, surge_probability, active_drivers
            )
        
        # Operational reduction
        if predicted_demand < 30:
            self._add_operational_reduction_recommendation(predicted_demand)
        
        logger.info(f"Generated {len(self.recommendations)} recommendations")
        return self.recommendations
    
    def _add_driver_recommendation(
        self,
        demand_change: float,
        predicted_demand: float,
        active_drivers: int,
        surge_probability: float
    ):
        """Add driver allocation recommendation"""
        # Calculate drivers needed
        drivers_per_demand_unit = 0.05  # 1 driver per 20 demand units
        additional_drivers = max(1, int(demand_change * drivers_per_demand_unit))
        
        # Confidence based on surge probability
        confidence = min(0.95, 0.6 + surge_probability * 0.35)
        
        # Expected effect
        estimated_effect = {
            'current_drivers': active_drivers,
            'recommended_drivers': active_drivers + additional_drivers,
            'expected_delivery_time_reduction': f"{int(additional_drivers * 5)} minutes",
            'expected_customer_satisfaction_increase': f"{int(additional_drivers * 3)}%",
        }
        
        recommendation = Recommendation(
            recommendation_id=f"rec_{self.recommendation_counter}",
            recommendation_type=RecommendationType.ADD_DRIVERS,
            title=f"Add {additional_drivers} Driver(s)",
            description=f"Increase driver count to handle predicted demand surge",
            reason=f"Demand expected to increase by {demand_change:.0f} units (surge probability: {surge_probability*100:.0f}%)",
            action_items=[
                f"Activate {additional_drivers} standby driver(s)",
                "Notify drivers of potential surge",
                "Prepare additional delivery vehicles",
                "Brief drivers on high-demand zones",
            ],
            confidence_score=confidence,
            expected_impact=ExpectedImpact.SIGNIFICANT if demand_change > 50 else ExpectedImpact.MODERATE,
            urgency_level=self._calculate_urgency(surge_probability),
            estimated_effect=estimated_effect,
        )
        
        self.recommendations.append(recommendation)
        self.recommendation_counter += 1
    
    def _remove_driver_recommendation(
        self,
        demand_change: float,
        predicted_demand: float,
        active_drivers: int
    ):
        """Add driver reduction recommendation"""
        # Calculate drivers to remove
        drivers_per_demand_unit = 0.05
        drivers_to_remove = max(1, int(abs(demand_change) * drivers_per_demand_unit))
        drivers_to_remove = min(drivers_to_remove, max(1, active_drivers - 2))  # Keep minimum
        
        confidence = 0.7
        
        estimated_effect = {
            'current_drivers': active_drivers,
            'recommended_drivers': active_drivers - drivers_to_remove,
            'expected_cost_savings': f"${drivers_to_remove * 50} per shift",
        }
        
        recommendation = Recommendation(
            recommendation_id=f"rec_{self.recommendation_counter}",
            recommendation_type=RecommendationType.REMOVE_DRIVERS,
            title=f"Reduce Driver Count by {drivers_to_remove}",
            description="Reduce driver count due to predicted demand decrease",
            reason=f"Demand expected to decrease by {abs(demand_change):.0f} units",
            action_items=[
                f"Stand down {drivers_to_remove} driver(s)",
                "Consolidate remaining drivers to active zones",
                "Optimize delivery routes",
            ],
            confidence_score=confidence,
            expected_impact=ExpectedImpact.MINIMAL,
            urgency_level=UrgencyLevel.LOW,
            estimated_effect=estimated_effect,
        )
        
        self.recommendations.append(recommendation)
        self.recommendation_counter += 1
    
    def _add_zone_rebalancing_recommendation(
        self,
        predicted_demand: float,
        available_zones: int,
        surge_probability: float
    ):
        """Add zone rebalancing recommendation"""
        # Calculate priority zones
        priority_zones = max(1, int(available_zones * 0.5))
        
        confidence = min(0.9, 0.7 + surge_probability * 0.2)
        
        estimated_effect = {
            'total_zones': available_zones,
            'priority_zones': priority_zones,
            'expected_coverage_improvement': "15-20%",
            'expected_response_time_reduction': "5-10 minutes",
        }
        
        recommendation = Recommendation(
            recommendation_id=f"rec_{self.recommendation_counter}",
            recommendation_type=RecommendationType.REBALANCE_ZONES,
            title="Rebalance Drivers Across Zones",
            description="Redistribute drivers to high-demand zones",
            reason=f"High surge probability ({surge_probability*100:.0f}%) detected - optimize zone coverage",
            action_items=[
                f"Identify top {priority_zones} high-demand zones",
                "Reassign drivers to priority zones",
                "Monitor zone-level demand in real-time",
                "Adjust zone boundaries if needed",
            ],
            confidence_score=confidence,
            expected_impact=ExpectedImpact.SIGNIFICANT,
            urgency_level=self._calculate_urgency(surge_probability),
            estimated_effect=estimated_effect,
        )
        
        self.recommendations.append(recommendation)
        self.recommendation_counter += 1
    
    def _add_radius_reduction_recommendation(self, predicted_demand: float):
        """Add delivery radius reduction recommendation"""
        radius_reduction = 0.2  # 20% reduction
        
        confidence = 0.8
        
        estimated_effect = {
            'radius_reduction_percentage': f"{radius_reduction*100:.0f}%",
            'expected_delivery_time_reduction': "10-15 minutes",
            'expected_customer_satisfaction_improvement': "5-8%",
            'coverage_area_reduction': f"{radius_reduction*100:.0f}%",
        }
        
        recommendation = Recommendation(
            recommendation_id=f"rec_{self.recommendation_counter}",
            recommendation_type=RecommendationType.REDUCE_RADIUS,
            title="Reduce Delivery Radius",
            description="Focus on nearby delivery areas during high demand",
            reason=f"High demand ({predicted_demand:.0f}) - reduce radius to improve delivery times",
            action_items=[
                f"Reduce delivery radius by {radius_reduction*100:.0f}%",
                "Focus on high-density areas",
                "Notify customers of potential service area changes",
                "Prepare alternative delivery partners for outer areas",
            ],
            confidence_score=confidence,
            expected_impact=ExpectedImpact.SIGNIFICANT,
            urgency_level=UrgencyLevel.HIGH,
            estimated_effect=estimated_effect,
        )
        
        self.recommendations.append(recommendation)
        self.recommendation_counter += 1
    
    def _add_radius_expansion_recommendation(self, predicted_demand: float):
        """Add delivery radius expansion recommendation"""
        radius_expansion = 0.15  # 15% expansion
        
        confidence = 0.75
        
        estimated_effect = {
            'radius_expansion_percentage': f"{radius_expansion*100:.0f}%",
            'expected_order_volume_increase': "10-15%",
            'coverage_area_expansion': f"{radius_expansion*100:.0f}%",
        }
        
        recommendation = Recommendation(
            recommendation_id=f"rec_{self.recommendation_counter}",
            recommendation_type=RecommendationType.EXPAND_RADIUS,
            title="Expand Delivery Radius",
            description="Extend delivery area to capture more orders",
            reason=f"Low demand ({predicted_demand:.0f}) - expand radius to increase order volume",
            action_items=[
                f"Expand delivery radius by {radius_expansion*100:.0f}%",
                "Update delivery area in customer app",
                "Market expanded service area",
                "Ensure driver capacity for new areas",
            ],
            confidence_score=confidence,
            expected_impact=ExpectedImpact.MODERATE,
            urgency_level=UrgencyLevel.LOW,
            estimated_effect=estimated_effect,
        )
        
        self.recommendations.append(recommendation)
        self.recommendation_counter += 1
    
    def _add_surge_preparation_recommendation(
        self,
        predicted_demand: float,
        surge_probability: float,
        active_drivers: int
    ):
        """Add surge preparation recommendation"""
        confidence = min(0.95, 0.7 + surge_probability * 0.25)
        
        estimated_effect = {
            'preparation_time': "15-30 minutes",
            'expected_surge_magnitude': f"{int(surge_probability * 100)}% probability",
            'recommended_buffer_capacity': f"{int(active_drivers * 0.3)} additional drivers on standby",
        }
        
        recommendation = Recommendation(
            recommendation_id=f"rec_{self.recommendation_counter}",
            recommendation_type=RecommendationType.PREPARE_SURGE,
            title="Prepare for Demand Surge",
            description="Proactively prepare for predicted demand surge",
            reason=f"Surge probability: {surge_probability*100:.0f}% - predicted demand: {predicted_demand:.0f}",
            action_items=[
                "Alert management of potential surge",
                "Prepare additional drivers on standby",
                "Stock additional supplies",
                "Brief kitchen staff on potential volume increase",
                "Enable surge pricing if applicable",
                "Monitor demand in real-time",
            ],
            confidence_score=confidence,
            expected_impact=ExpectedImpact.SIGNIFICANT,
            urgency_level=self._calculate_urgency(surge_probability),
            estimated_effect=estimated_effect,
        )
        
        self.recommendations.append(recommendation)
        self.recommendation_counter += 1
    
    def _add_operational_reduction_recommendation(self, predicted_demand: float):
        """Add operational reduction recommendation"""
        confidence = 0.75
        
        estimated_effect = {
            'expected_cost_savings': "20-30%",
            'driver_reduction': "30-40%",
            'operational_efficiency_improvement': "15-20%",
        }
        
        recommendation = Recommendation(
            recommendation_id=f"rec_{self.recommendation_counter}",
            recommendation_type=RecommendationType.REDUCE_OPERATIONS,
            title="Reduce Operational Intensity",
            description="Scale back operations during low demand period",
            reason=f"Low demand predicted ({predicted_demand:.0f}) - optimize resource utilization",
            action_items=[
                "Reduce driver count to minimum",
                "Consolidate delivery zones",
                "Reduce kitchen staffing",
                "Optimize delivery routes",
                "Monitor for demand changes",
            ],
            confidence_score=confidence,
            expected_impact=ExpectedImpact.MODERATE,
            urgency_level=UrgencyLevel.LOW,
            estimated_effect=estimated_effect,
        )
        
        self.recommendations.append(recommendation)
        self.recommendation_counter += 1
    
    def _calculate_urgency(self, surge_probability: float) -> UrgencyLevel:
        """Calculate urgency level based on surge probability"""
        if surge_probability > 0.8:
            return UrgencyLevel.CRITICAL
        elif surge_probability > 0.7:
            return UrgencyLevel.HIGH
        elif surge_probability > 0.5:
            return UrgencyLevel.MODERATE
        elif surge_probability > 0.3:
            return UrgencyLevel.LOW
        else:
            return UrgencyLevel.MINIMAL
    
    def get_recommendations_dict(self) -> List[Dict]:
        """Get all recommendations as dictionaries"""
        return [rec.to_dict() for rec in self.recommendations]
    
    def get_top_recommendations(self, count: int = 3) -> List[Recommendation]:
        """Get top N recommendations by urgency and confidence"""
        # Sort by urgency (critical first) and confidence (highest first)
        urgency_order = {
            UrgencyLevel.CRITICAL: 5,
            UrgencyLevel.HIGH: 4,
            UrgencyLevel.MODERATE: 3,
            UrgencyLevel.LOW: 2,
            UrgencyLevel.MINIMAL: 1,
        }
        
        sorted_recs = sorted(
            self.recommendations,
            key=lambda r: (
                urgency_order.get(r.urgency_level, 0),
                r.confidence_score
            ),
            reverse=True
        )
        
        return sorted_recs[:count]


# Singleton instance
_decision_engine = None


def get_decision_engine() -> DecisionEngine:
    """Get or create decision engine instance"""
    global _decision_engine
    if _decision_engine is None:
        _decision_engine = DecisionEngine()
    return _decision_engine
