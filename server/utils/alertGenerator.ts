/**
 * Dynamic Alert Generation System
 * Phase 93: Create Dynamic Alert Generation System
 * Generates alerts only from live operational conditions
 */

export type AlertType = 'warning' | 'caution' | 'info';
export type AlertPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Alert {
  id: number;
  type: AlertType;
  title: string;
  message: string;
  confidence: number; // 0-1
  priority: AlertPriority;
  timestamp: Date;
  category: 'demand' | 'risk' | 'weather' | 'operational' | 'system';
  actionable: boolean;
  suggestedAction?: string;
}

interface AlertConditions {
  predictedOrders?: number;
  demandThreshold?: number;
  driverShortageRisk?: number;
  delayRisk?: number;
  weatherCode?: number;
  precipitation?: number;
  snowfall?: number;
  windSpeed?: number;
  hotspotsIntensity?: number;
  activeEventMultiplier?: number;
}

/**
 * Generate dynamic alerts based on live operational conditions
 * No static or hardcoded alerts - all generated from real data
 */
export function generateDynamicAlerts(conditions: AlertConditions): Alert[] {
  const alerts: Alert[] = [];
  let alertId = 1;

  // Demand surge alert (>40 orders predicted)
  if (
    conditions.predictedOrders !== undefined &&
    conditions.demandThreshold !== undefined &&
    conditions.predictedOrders > conditions.demandThreshold
  ) {
    const surge = ((conditions.predictedOrders - conditions.demandThreshold) / conditions.demandThreshold) * 100;
    alerts.push({
      id: alertId++,
      type: 'warning',
      title: 'High Demand Surge',
      message: `Predicted ${conditions.predictedOrders} orders (${surge.toFixed(0)}% above threshold)`,
      confidence: Math.min(1, 0.7 + surge / 200),
      priority: surge > 50 ? 'critical' : 'high',
      timestamp: new Date(),
      category: 'demand',
      actionable: true,
      suggestedAction: 'Consider adding extra drivers or extending delivery radius',
    });
  }

  // Driver shortage alert (>70% risk)
  if (conditions.driverShortageRisk !== undefined && conditions.driverShortageRisk > 0.7) {
    alerts.push({
      id: alertId++,
      type: 'warning',
      title: 'Driver Shortage Risk',
      message: `${(conditions.driverShortageRisk * 100).toFixed(0)}% probability of driver shortage`,
      confidence: conditions.driverShortageRisk,
      priority: conditions.driverShortageRisk > 0.85 ? 'critical' : 'high',
      timestamp: new Date(),
      category: 'risk',
      actionable: true,
      suggestedAction: 'Recruit additional drivers or adjust delivery schedule',
    });
  }

  // Delay risk alert (>60% probability)
  if (conditions.delayRisk !== undefined && conditions.delayRisk > 0.6) {
    alerts.push({
      id: alertId++,
      type: 'caution',
      title: 'High Delivery Delay Risk',
      message: `${(conditions.delayRisk * 100).toFixed(0)}% probability of delivery delays`,
      confidence: conditions.delayRisk,
      priority: conditions.delayRisk > 0.8 ? 'high' : 'medium',
      timestamp: new Date(),
      category: 'risk',
      actionable: true,
      suggestedAction: 'Prioritize orders and consider extending delivery windows',
    });
  }

  // Severe weather alert (precipitation + wind)
  if (
    conditions.precipitation !== undefined &&
    conditions.windSpeed !== undefined &&
    conditions.precipitation > 5 &&
    conditions.windSpeed > 30
  ) {
    alerts.push({
      id: alertId++,
      type: 'warning',
      title: 'Severe Weather Impact',
      message: `Heavy precipitation (${conditions.precipitation}mm) with strong winds (${conditions.windSpeed} km/h)`,
      confidence: 0.95,
      priority: 'high',
      timestamp: new Date(),
      category: 'weather',
      actionable: true,
      suggestedAction: 'Increase delivery time estimates and monitor driver safety',
    });
  }

  // Snowfall alert
  if (conditions.snowfall !== undefined && conditions.snowfall > 5) {
    alerts.push({
      id: alertId++,
      type: 'warning',
      title: 'Significant Snowfall',
      message: `${conditions.snowfall}mm of snow - road conditions may be hazardous`,
      confidence: 0.9,
      priority: conditions.snowfall > 15 ? 'high' : 'medium',
      timestamp: new Date(),
      category: 'weather',
      actionable: true,
      suggestedAction: 'Advise drivers to use winter tires and reduce speed',
    });
  }

  // Hotspot overload alert (>85% intensity)
  if (conditions.hotspotsIntensity !== undefined && conditions.hotspotsIntensity > 0.85) {
    alerts.push({
      id: alertId++,
      type: 'warning',
      title: 'Hotspot Overload',
      message: `Delivery hotspot at ${(conditions.hotspotsIntensity * 100).toFixed(0)}% capacity`,
      confidence: 0.85,
      priority: 'high',
      timestamp: new Date(),
      category: 'operational',
      actionable: true,
      suggestedAction: 'Distribute orders to alternate zones or increase driver allocation',
    });
  }

  // Active event impact alert
  if (conditions.activeEventMultiplier !== undefined && conditions.activeEventMultiplier > 1.3) {
    alerts.push({
      id: alertId++,
      type: 'info',
      title: 'Major Event Impact',
      message: `Active event increasing demand by ${((conditions.activeEventMultiplier - 1) * 100).toFixed(0)}%`,
      confidence: 0.8,
      priority: 'medium',
      timestamp: new Date(),
      category: 'operational',
      actionable: true,
      suggestedAction: 'Prepare for elevated order volume and ensure adequate staffing',
    });
  }

  return alerts;
}

/**
 * Filter alerts to remove resolved conditions
 * Auto-dismiss alerts when conditions improve
 */
export function filterResolvedAlerts(previousAlerts: Alert[], currentConditions: AlertConditions): Alert[] {
  return previousAlerts.filter(alert => {
    // Keep alert if condition still exists
    switch (alert.category) {
      case 'demand':
        return (
          currentConditions.predictedOrders !== undefined &&
          currentConditions.demandThreshold !== undefined &&
          currentConditions.predictedOrders > currentConditions.demandThreshold
        );

      case 'risk':
        if (alert.title.includes('Driver')) {
          return currentConditions.driverShortageRisk !== undefined && currentConditions.driverShortageRisk > 0.7;
        } else if (alert.title.includes('Delay')) {
          return currentConditions.delayRisk !== undefined && currentConditions.delayRisk > 0.6;
        }
        return true;

      case 'weather':
        if (alert.title.includes('Severe')) {
          return (
            currentConditions.precipitation !== undefined &&
            currentConditions.windSpeed !== undefined &&
            currentConditions.precipitation > 5 &&
            currentConditions.windSpeed > 30
          );
        } else if (alert.title.includes('Snowfall')) {
          return currentConditions.snowfall !== undefined && currentConditions.snowfall > 5;
        }
        return true;

      case 'operational':
        if (alert.title.includes('Hotspot')) {
          return currentConditions.hotspotsIntensity !== undefined && currentConditions.hotspotsIntensity > 0.85;
        } else if (alert.title.includes('Event')) {
          return currentConditions.activeEventMultiplier !== undefined && currentConditions.activeEventMultiplier > 1.3;
        }
        return true;

      default:
        return true;
    }
  });
}

/**
 * Get alert severity color
 */
export function getAlertSeverityColor(priority: AlertPriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-100 border-red-500 text-red-900';
    case 'high':
      return 'bg-orange-100 border-orange-500 text-orange-900';
    case 'medium':
      return 'bg-yellow-100 border-yellow-500 text-yellow-900';
    case 'low':
      return 'bg-blue-100 border-blue-500 text-blue-900';
    default:
      return 'bg-gray-100 border-gray-500 text-gray-900';
  }
}

/**
 * Get alert icon based on priority
 */
export function getAlertIcon(priority: AlertPriority): string {
  switch (priority) {
    case 'critical':
      return '🚨';
    case 'high':
      return '⚠️';
    case 'medium':
      return '⚡';
    case 'low':
      return 'ℹ️';
    default:
      return '📋';
  }
}

/**
 * Format alert for display
 */
export function formatAlertForDisplay(alert: Alert): string {
  return `[${alert.priority.toUpperCase()}] ${alert.title}: ${alert.message}`;
}
