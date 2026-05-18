/**
 * PHASE 2: Predict Adaptation Engine
 * 
 * Dynamically adapts predicts based on:
 * - Real-time orders
 * - Driver availability
 * - Current backlog
 * - Weather changes
 * - Active events
 * - Time progression
 */

export interface AdaptationFactors {
  baselinePredict: number;
  realtimeOrderMultiplier: number;
  driverAvailabilityMultiplier: number;
  backlogMultiplier: number;
  weatherMultiplier: number;
  eventMultiplier: number;
  timeProgressionMultiplier: number;
  finalAdaptedPredict: number;
  adaptationReason: string[];
}

/**
 * Calculate multiplier based on real-time order velocity
 */
export function calculateRealtimeOrderMultiplier(
  ordersInLastHour: number,
  historicalAveragePerHour: number,
): number {
  if (historicalAveragePerHour === 0) return 1.0;

  const ratio = ordersInLastHour / historicalAveragePerHour;

  // If orders are coming in faster than average, increase predict
  if (ratio > 1.5) return 1.4;
  if (ratio > 1.2) return 1.2;
  if (ratio > 1.0) return 1.1;
  if (ratio < 0.5) return 0.7;
  if (ratio < 0.8) return 0.9;

  return 1.0;
}

/**
 * Calculate multiplier based on driver availability
 */
export function calculateDriverAvailabilityMultiplier(
  availableDrivers: number,
  totalDrivers: number,
  averageOrdersPerDriver: number,
): number {
  const availabilityRatio = availableDrivers / totalDrivers;

  // If drivers are scarce, reduce predict to realistic levels
  if (availabilityRatio < 0.3) return 0.6;
  if (availabilityRatio < 0.5) return 0.8;
  if (availabilityRatio < 0.7) return 0.9;

  return 1.0;
}

/**
 * Calculate multiplier based on current backlog
 */
export function calculateBacklogMultiplier(
  currentBacklog: number,
  maxCapacity: number,
): number {
  const backlogRatio = currentBacklog / maxCapacity;

  // High backlog means we're near capacity
  if (backlogRatio > 0.9) return 0.5; // Severely reduce predict
  if (backlogRatio > 0.7) return 0.7;
  if (backlogRatio > 0.5) return 0.85;

  return 1.0;
}

/**
 * Calculate multiplier based on weather
 */
export function calculateWeatherMultiplier(weatherCondition: string): number {
  switch (weatherCondition.toLowerCase()) {
    case 'clear':
    case 'sunny':
      return 1.0;
    case 'cloudy':
    case 'partly_cloudy':
      return 0.95;
    case 'light_rain':
    case 'drizzle':
      return 1.1; // More orders in light rain
    case 'heavy_rain':
    case 'thunderstorm':
      return 1.3; // Significantly more orders
    case 'snow':
    case 'blizzard':
      return 0.7; // Fewer orders in snow
    case 'extreme_heat':
      return 1.15; // More delivery orders
    case 'extreme_cold':
      return 0.8;
    default:
      return 1.0;
  }
}

/**
 * Calculate multiplier based on active events
 */
export function calculateEventMultiplier(events: Array<{
  type: string;
  intensity: 'low' | 'medium' | 'high';
}>): number {
  let multiplier = 1.0;

  for (const event of events) {
    switch (event.type.toLowerCase()) {
      case 'promotion':
        multiplier *= event.intensity === 'high' ? 1.5 : event.intensity === 'medium' ? 1.3 : 1.1;
        break;
      case 'holiday':
        multiplier *= event.intensity === 'high' ? 1.4 : event.intensity === 'medium' ? 1.2 : 1.05;
        break;
      case 'sporting_event':
        multiplier *= event.intensity === 'high' ? 1.6 : event.intensity === 'medium' ? 1.3 : 1.1;
        break;
      case 'concert':
      case 'festival':
        multiplier *= event.intensity === 'high' ? 1.5 : event.intensity === 'medium' ? 1.25 : 1.1;
        break;
      case 'school_closure':
        multiplier *= 1.2; // More orders when kids are home
        break;
      case 'traffic_incident':
        multiplier *= event.intensity === 'high' ? 0.6 : event.intensity === 'medium' ? 0.8 : 0.95;
        break;
      default:
        break;
    }
  }

  return multiplier;
}

/**
 * Calculate multiplier based on time progression through the day
 */
export function calculateTimeProgressionMultiplier(
  currentHour: number,
  hoursUntilDeadline: number,
): number {
  // As deadline approaches, orders typically increase
  if (hoursUntilDeadline < 1) return 1.5; // Last hour rush
  if (hoursUntilDeadline < 2) return 1.3;
  if (hoursUntilDeadline < 3) return 1.15;
  if (hoursUntilDeadline < 6) return 1.05;

  return 1.0;
}

/**
 * Adapt predict based on all factors
 */
export function adaptPredict(params: {
  baselinePredict: number;
  ordersInLastHour: number;
  historicalAveragePerHour: number;
  availableDrivers: number;
  totalDrivers: number;
  currentBacklog: number;
  maxCapacity: number;
  weatherCondition: string;
  activeEvents: Array<{ type: string; intensity: 'low' | 'medium' | 'high' }>;
  currentHour: number;
  hoursUntilDeadline: number;
}): AdaptationFactors {
  const reasons: string[] = [];

  const realtimeOrderMultiplier = calculateRealtimeOrderMultiplier(
    params.ordersInLastHour,
    params.historicalAveragePerHour,
  );
  if (realtimeOrderMultiplier !== 1.0) {
    reasons.push(`Real-time orders ${realtimeOrderMultiplier > 1 ? 'increasing' : 'decreasing'} demand`);
  }

  const driverAvailabilityMultiplier = calculateDriverAvailabilityMultiplier(
    params.availableDrivers,
    params.totalDrivers,
    0, // Would calculate from historical data
  );
  if (driverAvailabilityMultiplier !== 1.0) {
    reasons.push(`Driver availability affecting capacity`);
  }

  const backlogMultiplier = calculateBacklogMultiplier(
    params.currentBacklog,
    params.maxCapacity,
  );
  if (backlogMultiplier !== 1.0) {
    reasons.push(`Current backlog at ${((params.currentBacklog / params.maxCapacity) * 100).toFixed(0)}% capacity`);
  }

  const weatherMultiplier = calculateWeatherMultiplier(params.weatherCondition);
  if (weatherMultiplier !== 1.0) {
    reasons.push(`Weather (${params.weatherCondition}) affecting demand`);
  }

  const eventMultiplier = calculateEventMultiplier(params.activeEvents);
  if (eventMultiplier !== 1.0) {
    reasons.push(`${params.activeEvents.length} active event(s) impacting demand`);
  }

  const timeProgressionMultiplier = calculateTimeProgressionMultiplier(
    params.currentHour,
    params.hoursUntilDeadline,
  );
  if (timeProgressionMultiplier !== 1.0) {
    reasons.push(`Time progression: ${params.hoursUntilDeadline} hours until deadline`);
  }

  // Calculate final adapted predict
  const finalAdaptedPredict = Math.round(
    params.baselinePredict *
    realtimeOrderMultiplier *
    driverAvailabilityMultiplier *
    backlogMultiplier *
    weatherMultiplier *
    eventMultiplier *
    timeProgressionMultiplier,
  );

  return {
    baselinePredict: params.baselinePredict,
    realtimeOrderMultiplier,
    driverAvailabilityMultiplier,
    backlogMultiplier,
    weatherMultiplier,
    eventMultiplier,
    timeProgressionMultiplier,
    finalAdaptedPredict,
    adaptationReason: reasons,
  };
}

/**
 * Get adaptation explanation for UI display
 */
export function getAdaptationExplanation(factors: AdaptationFactors): string {
  if (factors.adaptationReason.length === 0) {
    return 'Using baseline predict';
  }

  const change = factors.finalAdaptedPredict - factors.baselinePredict;
  const changePercent = ((change / factors.baselinePredict) * 100).toFixed(0);

  return `Predict ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(Number(changePercent))}% due to: ${factors.adaptationReason.join(', ')}`;
}
