import { describe, it, expect } from 'vitest';
import {
  calculateWeatherImpact,
  getWeatherDescription,
  applyWeatherToDemand,
  applyWeatherToDelayRisk,
  applyWeatherToHotspotIntensity,
  applyWeatherToDriverShortageRisk,
  generateWeatherRecommendations,
} from './utils/weatherImpact';

describe('Weather Impact System', () => {
  const clearWeather = {
    temperature: 15,
    apparent_temperature: 14,
    humidity: 60,
    precipitation: 0,
    snowfall: 0,
    weather_code: 0,
    wind_speed: 10,
    wind_direction: 180,
    wind_gusts: 15,
    visibility: 10000,
  };

  const badWeather = {
    temperature: -10,
    apparent_temperature: -15,
    humidity: 85,
    precipitation: 5,
    snowfall: 3,
    weather_code: 71,
    wind_speed: 28,
    wind_direction: 180,
    wind_gusts: 35,
    visibility: 3000,
  };

  describe('calculateWeatherImpact', () => {
    it('should return low impact for clear weather', () => {
      const impact = calculateWeatherImpact(clearWeather);
      expect(impact.demandMultiplier).toBe(1.0);
      expect(impact.delayRiskIncrease).toBeLessThan(0.1);
      expect(impact.operationalDifficultyScore).toBeLessThan(0.1);
    });

    it('should return high impact for bad weather', () => {
      const impact = calculateWeatherImpact(badWeather);
      expect(impact.demandMultiplier).toBeGreaterThan(1.2);
      expect(impact.delayRiskIncrease).toBeGreaterThan(0.1);
      expect(impact.operationalDifficultyScore).toBeGreaterThan(0.3);
    });

    it('should return valid severity level', () => {
      const impact = calculateWeatherImpact(clearWeather);
      expect(['low', 'medium', 'high', 'critical']).toContain(impact.severityLevel);
    });

    it('should return weather description', () => {
      const impact = calculateWeatherImpact(clearWeather);
      expect(impact.weatherDescription).toBeTruthy();
      expect(typeof impact.weatherDescription).toBe('string');
    });

    it('should handle snowfall correctly', () => {
      const snowWeather = { ...clearWeather, snowfall: 5, weather_code: 71 };
      const impact = calculateWeatherImpact(snowWeather);
      expect(impact.demandMultiplier).toBeGreaterThan(1.2);
    });

    it('should handle heavy rain correctly', () => {
      const rainWeather = { ...clearWeather, precipitation: 10, weather_code: 63 };
      const impact = calculateWeatherImpact(rainWeather);
      expect(impact.demandMultiplier).toBeGreaterThan(1.1);
    });

    it('should handle cold temperature correctly', () => {
      const coldWeather = { ...clearWeather, temperature: -15, apparent_temperature: -18 };
      const impact = calculateWeatherImpact(coldWeather);
      expect(impact.demandMultiplier).toBeGreaterThan(1.1);
    });

    it('should handle hot weather correctly', () => {
      const hotWeather = { ...clearWeather, temperature: 35, apparent_temperature: 37 };
      const impact = calculateWeatherImpact(hotWeather);
      expect(impact.demandMultiplier).toBeLessThan(1.0);
    });

    it('should handle strong wind correctly', () => {
      const windyWeather = { ...clearWeather, wind_speed: 30, wind_gusts: 40 };
      const impact = calculateWeatherImpact(windyWeather);
      expect(impact.delayRiskIncrease).toBeGreaterThan(0.1);
    });

    it('should handle low visibility correctly', () => {
      const foggyWeather = { ...clearWeather, visibility: 2000, weather_code: 45 };
      const impact = calculateWeatherImpact(foggyWeather);
      expect(impact.delayRiskIncrease).toBeGreaterThan(0.05);
    });

    it('should not go below 0.8 demand multiplier', () => {
      const extremeHotWeather = { ...clearWeather, temperature: 45, apparent_temperature: 48 };
      const impact = calculateWeatherImpact(extremeHotWeather);
      expect(impact.demandMultiplier).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('getWeatherDescription', () => {
    it('should return Clear for code 0', () => {
      expect(getWeatherDescription(0)).toBe('Clear');
    });

    it('should return Partly Cloudy for code 2', () => {
      expect(getWeatherDescription(2)).toBe('Partly Cloudy');
    });

    it('should return Rain for code 63', () => {
      expect(getWeatherDescription(63)).toBe('Rain');
    });

    it('should return Snow for code 71', () => {
      expect(getWeatherDescription(71)).toBe('Snow');
    });

    it('should return Thunderstorm for code 95', () => {
      expect(getWeatherDescription(95)).toBe('Thunderstorm');
    });

    it('should return Unknown for invalid code', () => {
      expect(getWeatherDescription(999)).toBe('Unknown');
    });
  });

  describe('applyWeatherToDemand', () => {
    it('should multiply demand by weather multiplier', () => {
      const impact = calculateWeatherImpact(clearWeather);
      const adjusted = applyWeatherToDemand(100, impact);
      expect(adjusted).toBe(100 * impact.demandMultiplier);
    });

    it('should increase demand for bad weather', () => {
      const impact = calculateWeatherImpact(badWeather);
      const adjusted = applyWeatherToDemand(100, impact);
      expect(adjusted).toBeGreaterThan(100);
    });

    it('should decrease demand for hot weather', () => {
      const hotWeather = { ...clearWeather, temperature: 35, apparent_temperature: 37 };
      const impact = calculateWeatherImpact(hotWeather);
      const adjusted = applyWeatherToDemand(100, impact);
      expect(adjusted).toBeLessThan(100);
    });
  });

  describe('applyWeatherToDelayRisk', () => {
    it('should add delay risk increase to base risk', () => {
      const impact = calculateWeatherImpact(clearWeather);
      const adjusted = applyWeatherToDelayRisk(0.1, impact);
      expect(adjusted).toBe(0.1 + impact.delayRiskIncrease);
    });

    it('should increase delay risk for bad weather', () => {
      const impact = calculateWeatherImpact(badWeather);
      const adjusted = applyWeatherToDelayRisk(0.1, impact);
      expect(adjusted).toBeGreaterThan(0.1);
      expect(adjusted).toBeLessThanOrEqual(1.0);
    });

    it('should cap at 1.0', () => {
      const impact = calculateWeatherImpact(badWeather);
      const adjusted = applyWeatherToDelayRisk(0.95, impact);
      expect(adjusted).toBeLessThanOrEqual(1.0);
    });
  });

  describe('applyWeatherToHotspotIntensity', () => {
    it('should multiply intensity by weather multiplier', () => {
      const impact = calculateWeatherImpact(clearWeather);
      const adjusted = applyWeatherToHotspotIntensity(0.5, impact);
      expect(adjusted).toBe(0.5 * impact.hotspotIntensityMultiplier);
    });

    it('should increase intensity for bad weather', () => {
      const impact = calculateWeatherImpact(badWeather);
      const adjusted = applyWeatherToHotspotIntensity(0.5, impact);
      expect(adjusted).toBeGreaterThan(0.5);
    });
  });

  describe('applyWeatherToDriverShortageRisk', () => {
    it('should add shortage risk increase to base risk', () => {
      const impact = calculateWeatherImpact(clearWeather);
      const adjusted = applyWeatherToDriverShortageRisk(0.2, impact);
      expect(adjusted).toBe(0.2 + impact.driverShortageRiskIncrease);
    });

    it('should increase shortage risk for bad weather', () => {
      const impact = calculateWeatherImpact(badWeather);
      const adjusted = applyWeatherToDriverShortageRisk(0.2, impact);
      expect(adjusted).toBeGreaterThan(0.2);
      expect(adjusted).toBeLessThanOrEqual(1.0);
    });

    it('should cap at 1.0', () => {
      const impact = calculateWeatherImpact(badWeather);
      const adjusted = applyWeatherToDriverShortageRisk(0.95, impact);
      expect(adjusted).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateWeatherRecommendations', () => {
    it('should return array for clear weather', () => {
      const impact = calculateWeatherImpact(clearWeather);
      const recommendations = generateWeatherRecommendations(impact);
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should return recommendations for bad weather', () => {
      const impact = calculateWeatherImpact(badWeather);
      const recommendations = generateWeatherRecommendations(impact);
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return actionable recommendations', () => {
      const impact = calculateWeatherImpact(badWeather);
      const recommendations = generateWeatherRecommendations(impact);
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
        expect(rec.length).toBeGreaterThan(0);
      });
    });

    it('should include weather-specific guidance', () => {
      const snowWeather = { ...clearWeather, snowfall: 5, weather_code: 71 };
      const impact = calculateWeatherImpact(snowWeather);
      const recommendations = generateWeatherRecommendations(impact);
      expect(recommendations.length).toBeGreaterThan(0);
      const hasSnowRecommendation = recommendations.some(r => 
        r.toLowerCase().includes('snow') || 
        r.toLowerCase().includes('winter') ||
        r.toLowerCase().includes('driver')
      );
      expect(hasSnowRecommendation).toBe(true);
    });
  });
});
