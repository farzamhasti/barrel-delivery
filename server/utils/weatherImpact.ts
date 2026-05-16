/**
 * Weather Impact Calculation Module
 * 
 * Calculates weather-aware multipliers for:
 * - Demand forecasting
 * - Delay risk prediction
 * - Hotspot intensity
 * - Driver shortage risk
 * - Operational recommendations
 */

export interface WeatherData {
  temperature: number;
  apparent_temperature: number;
  humidity: number;
  precipitation: number;
  snowfall: number;
  weather_code: number;
  wind_speed: number;
  wind_direction: number;
  wind_gusts: number;
  visibility: number;
}

export interface WeatherImpactScore {
  demandMultiplier: number;
  delayRiskIncrease: number;
  hotspotIntensityMultiplier: number;
  driverShortageRiskIncrease: number;
  operationalDifficultyScore: number;
  weatherDescription: string;
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Get weather condition description from WMO code
 */
export function getWeatherDescription(code: number): string {
  if (code === 0 || code === 1) return 'Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code === 51 || code === 53 || code === 55) return 'Light Rain';
  if (code === 61 || code === 63 || code === 65) return 'Rain';
  if (code === 71 || code === 73 || code === 75) return 'Snow';
  if (code === 80 || code === 81 || code === 82) return 'Showers';
  if (code === 85 || code === 86) return 'Snow Showers';
  if (code === 95 || code === 96 || code === 99) return 'Thunderstorm';
  return 'Unknown';
}

/**
 * Calculate precipitation impact multiplier
 * Snow has higher impact than rain
 */
function calculatePrecipitationImpact(precipitation: number, snowfall: number): { multiplier: number; delayIncrease: number } {
  // Snowfall has priority over rain
  if (snowfall > 0) {
    if (snowfall >= 10) {
      // Heavy snowstorm
      return { multiplier: 1.40, delayIncrease: 0.22 };
    } else if (snowfall >= 5) {
      // Moderate snow
      return { multiplier: 1.35, delayIncrease: 0.18 };
    } else {
      // Light snow
      return { multiplier: 1.25, delayIncrease: 0.12 };
    }
  }

  // Rain impact
  if (precipitation > 0) {
    if (precipitation >= 10) {
      // Heavy rain
      return { multiplier: 1.25, delayIncrease: 0.15 };
    } else if (precipitation >= 5) {
      // Moderate rain
      return { multiplier: 1.20, delayIncrease: 0.10 };
    } else {
      // Light rain
      return { multiplier: 1.10, delayIncrease: 0.05 };
    }
  }

  // No precipitation
  return { multiplier: 1.0, delayIncrease: 0 };
}

/**
 * Calculate temperature impact multiplier
 * Cold weather increases demand, very cold increases difficulty
 */
function calculateTemperatureImpact(temperature: number, apparentTemperature: number): { multiplier: number; difficultyScore: number } {
  // Use apparent temperature (feels like) for more accurate impact
  const temp = apparentTemperature;

  if (temp <= -10) {
    // Extreme cold
    return { multiplier: 1.20, difficultyScore: 0.25 };
  } else if (temp <= 0) {
    // Cold (freezing)
    return { multiplier: 1.15, difficultyScore: 0.18 };
  } else if (temp <= 5) {
    // Cool
    return { multiplier: 1.10, difficultyScore: 0.10 };
  } else if (temp >= 25) {
    // Hot (reduces demand)
    return { multiplier: 0.90, difficultyScore: 0.05 };
  } else if (temp >= 20) {
    // Warm (reduces demand slightly)
    return { multiplier: 0.95, difficultyScore: 0.02 };
  }

  // Comfortable temperature
  return { multiplier: 1.0, difficultyScore: 0 };
}

/**
 * Calculate wind impact
 * High wind increases delays and operational difficulty
 */
function calculateWindImpact(windSpeed: number, windGusts: number): { delayIncrease: number; difficultyScore: number } {
  // Use gust speed for worst-case scenario
  const effectiveWind = Math.max(windSpeed, windGusts || windSpeed);

  if (effectiveWind >= 40) {
    // Severe wind
    return { delayIncrease: 0.25, difficultyScore: 0.30 };
  } else if (effectiveWind >= 30) {
    // Strong wind
    return { delayIncrease: 0.20, difficultyScore: 0.20 };
  } else if (effectiveWind >= 20) {
    // Moderate wind
    return { delayIncrease: 0.15, difficultyScore: 0.10 };
  } else if (effectiveWind >= 15) {
    // Light wind
    return { delayIncrease: 0.05, difficultyScore: 0.03 };
  }

  // Calm
  return { delayIncrease: 0, difficultyScore: 0 };
}

/**
 * Calculate visibility impact
 * Low visibility reduces delivery efficiency
 */
function calculateVisibilityImpact(visibility: number): { delayIncrease: number; difficultyScore: number } {
  // Visibility in meters
  if (visibility < 1000) {
    // Very poor visibility (fog/heavy snow)
    return { delayIncrease: 0.20, difficultyScore: 0.25 };
  } else if (visibility < 5000) {
    // Poor visibility
    return { delayIncrease: 0.15, difficultyScore: 0.15 };
  } else if (visibility < 10000) {
    // Moderate visibility
    return { delayIncrease: 0.05, difficultyScore: 0.05 };
  }

  // Good visibility
  return { delayIncrease: 0, difficultyScore: 0 };
}

/**
 * Determine weather severity level
 */
function determineSeverityLevel(
  precipitation: number,
  snowfall: number,
  windSpeed: number,
  weatherCode: number
): 'low' | 'medium' | 'high' | 'critical' {
  // Thunderstorm or severe weather codes
  if (weatherCode >= 95) {
    return 'critical';
  }

  // Heavy snow or heavy rain with strong wind
  if ((snowfall >= 10 || precipitation >= 10) && windSpeed >= 25) {
    return 'critical';
  }

  // Heavy snow or heavy rain
  if (snowfall >= 10 || precipitation >= 10) {
    return 'high';
  }

  // Moderate snow/rain with wind
  if ((snowfall >= 5 || precipitation >= 5) && windSpeed >= 20) {
    return 'high';
  }

  // Moderate snow/rain or strong wind
  if (snowfall >= 5 || precipitation >= 5 || windSpeed >= 25) {
    return 'medium';
  }

  // Light precipitation or moderate wind
  if (precipitation > 0 || windSpeed >= 15) {
    return 'low';
  }

  // Clear/calm
  return 'low';
}

/**
 * Calculate comprehensive weather impact score
 * Returns multipliers for all operational factors
 */
export function calculateWeatherImpact(weather: WeatherData): WeatherImpactScore {
  // Calculate individual impacts
  const precipitationImpact = calculatePrecipitationImpact(weather.precipitation, weather.snowfall);
  const temperatureImpact = calculateTemperatureImpact(weather.temperature, weather.apparent_temperature);
  const windImpact = calculateWindImpact(weather.wind_speed, weather.wind_gusts);
  const visibilityImpact = calculateVisibilityImpact(weather.visibility);

  // Combine demand multipliers (multiplicative)
  const demandMultiplier = precipitationImpact.multiplier * temperatureImpact.multiplier;

  // Combine delay risks (additive with cap at 1.0)
  const delayRiskIncrease = Math.min(
    precipitationImpact.delayIncrease + windImpact.delayIncrease + visibilityImpact.delayIncrease,
    1.0
  );

  // Hotspot intensity multiplier (similar to demand but more sensitive to precipitation)
  const hotspotIntensityMultiplier = precipitationImpact.multiplier * 1.1; // 10% boost for hotspot intensity

  // Driver shortage risk (increases with difficulty)
  const driverShortageRiskIncrease = Math.min(
    delayRiskIncrease * 1.2, // Delay risk increases driver shortage
    1.0
  );

  // Overall operational difficulty (0-1 scale)
  const operationalDifficultyScore = Math.min(
    temperatureImpact.difficultyScore + windImpact.difficultyScore + visibilityImpact.difficultyScore,
    1.0
  );

  // Determine severity level
  const severityLevel = determineSeverityLevel(
    weather.precipitation,
    weather.snowfall,
    weather.wind_speed,
    weather.weather_code
  );

  return {
    demandMultiplier: Math.round(demandMultiplier * 100) / 100, // Round to 2 decimals
    delayRiskIncrease: Math.round(delayRiskIncrease * 100) / 100,
    hotspotIntensityMultiplier: Math.round(hotspotIntensityMultiplier * 100) / 100,
    driverShortageRiskIncrease: Math.round(driverShortageRiskIncrease * 100) / 100,
    operationalDifficultyScore: Math.round(operationalDifficultyScore * 100) / 100,
    weatherDescription: getWeatherDescription(weather.weather_code),
    severityLevel,
  };
}

/**
 * Apply weather adjustments to demand forecast
 */
export function applyWeatherToDemand(baseDemand: number, weatherImpact: WeatherImpactScore): number {
  return Math.round(baseDemand * weatherImpact.demandMultiplier);
}

/**
 * Apply weather adjustments to delay risk
 */
export function applyWeatherToDelayRisk(baseDelayRisk: number, weatherImpact: WeatherImpactScore): number {
  return Math.min(baseDelayRisk + weatherImpact.delayRiskIncrease, 1.0);
}

/**
 * Apply weather adjustments to hotspot intensity
 */
export function applyWeatherToHotspotIntensity(baseIntensity: number, weatherImpact: WeatherImpactScore): number {
  return Math.round(baseIntensity * weatherImpact.hotspotIntensityMultiplier * 100) / 100;
}

/**
 * Apply weather adjustments to driver shortage risk
 */
export function applyWeatherToDriverShortageRisk(baseRisk: number, weatherImpact: WeatherImpactScore): number {
  return Math.min(baseRisk + weatherImpact.driverShortageRiskIncrease, 1.0);
}

/**
 * Generate weather-aware recommendation adjustments
 */
export function generateWeatherRecommendations(weatherImpact: WeatherImpactScore): string[] {
  const recommendations: string[] = [];

  // Demand-based recommendations
  if (weatherImpact.demandMultiplier > 1.2) {
    recommendations.push('High demand expected - consider adding extra drivers');
  } else if (weatherImpact.demandMultiplier < 0.9) {
    recommendations.push('Lower demand expected - optimize driver allocation');
  }

  // Delay risk recommendations
  if (weatherImpact.delayRiskIncrease > 0.15) {
    recommendations.push('Increase delivery time buffer for customer expectations');
  }

  // Severity-based recommendations
  if (weatherImpact.severityLevel === 'critical') {
    recommendations.push('CRITICAL: Monitor operations closely - severe weather conditions');
    recommendations.push('Consider temporary service restrictions if conditions worsen');
  } else if (weatherImpact.severityLevel === 'high') {
    recommendations.push('HIGH RISK: Prepare contingency plans for severe weather');
    recommendations.push('Increase driver communication frequency');
  }

  // Specific weather recommendations
  if (weatherImpact.weatherDescription.includes('Snow')) {
    recommendations.push('Snow conditions detected - prioritize experienced drivers');
    recommendations.push('Allow extended delivery times for snow-affected areas');
  }

  if (weatherImpact.weatherDescription.includes('Rain')) {
    recommendations.push('Rain detected - ensure drivers have weather protection');
  }

  if (weatherImpact.operationalDifficultyScore > 0.2) {
    recommendations.push('Operational difficulty elevated - monitor delivery success rates');
  }

  return recommendations;
}
