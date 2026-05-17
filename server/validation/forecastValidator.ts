/**
 * Forecast Validator
 * Ensures all forecasts are real, verified, and properly sourced
 */

import { logger } from '../utils/logger';

interface ForecastValidation {
  isValid: boolean;
  source: 'ml' | 'heuristic' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  learningStatus: 'early_learning' | 'learning' | 'trained' | 'production' | 'fallback_mode';
  reasoning: string;
  dataQuality: {
    hasHistoricalData: boolean;
    historicalDataPoints: number;
    dataCompleteness: number; // 0-1
    dataFreshness: number; // 0-1 (1 = very recent)
  };
  validationErrors: string[];
  warnings: string[];
}

interface ForecastSource {
  type: 'ml' | 'heuristic' | 'fallback';
  model?: string;
  version?: string;
  trainedOn?: number; // timestamp
  accuracy?: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Forecast Validator
 * Validates forecasts and ensures they are real and verified
 */
export class ForecastValidator {
  private readonly MIN_HISTORICAL_POINTS = 10;
  private readonly MIN_DATA_COMPLETENESS = 0.6; // 60%
  private readonly MIN_DATA_FRESHNESS = 0.3; // 30% of max age

  constructor() {
    logger.info('Forecast Validator initialized');
  }

  /**
   * Validate forecast
   */
  validateForecast(
    forecast: any,
    historicalDataPoints: number,
    dataCompleteness: number,
    dataFreshness: number,
    source: ForecastSource
  ): ForecastValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    // Check data quality
    if (historicalDataPoints < this.MIN_HISTORICAL_POINTS) {
      errors.push(
        `Insufficient historical data: ${historicalDataPoints} points (minimum: ${this.MIN_HISTORICAL_POINTS})`
      );
      isValid = false;
    }

    if (dataCompleteness < this.MIN_DATA_COMPLETENESS) {
      errors.push(
        `Data completeness too low: ${(dataCompleteness * 100).toFixed(1)}% (minimum: ${(this.MIN_DATA_COMPLETENESS * 100).toFixed(1)}%)`
      );
      isValid = false;
    }

    if (dataFreshness < this.MIN_DATA_FRESHNESS) {
      warnings.push(
        `Data freshness low: ${(dataFreshness * 100).toFixed(1)}% (recommended: >${(this.MIN_DATA_FRESHNESS * 100).toFixed(1)}%)`
      );
    }

    // Validate forecast values
    if (forecast.demand === undefined || forecast.demand === null) {
      errors.push('Forecast demand value is missing');
      isValid = false;
    }

    if (typeof forecast.demand !== 'number' || forecast.demand < 0) {
      errors.push('Forecast demand value is invalid');
      isValid = false;
    }

    if (forecast.confidence === undefined || !['high', 'medium', 'low'].includes(forecast.confidence)) {
      errors.push('Forecast confidence level is invalid');
      isValid = false;
    }

    // Validate source
    if (!source || !['ml', 'heuristic', 'fallback'].includes(source.type)) {
      errors.push('Forecast source is invalid or missing');
      isValid = false;
    }

    // Determine learning status
    let learningStatus: 'early_learning' | 'learning' | 'trained' | 'production' | 'fallback_mode' =
      'early_learning';

    if (source.type === 'fallback') {
      learningStatus = 'fallback_mode';
    } else if (historicalDataPoints < 50) {
      learningStatus = 'early_learning';
    } else if (historicalDataPoints < 200) {
      learningStatus = 'learning';
    } else if (source.accuracy && source.accuracy > 0.8) {
      learningStatus = 'production';
    } else {
      learningStatus = 'trained';
    }

    // Generate reasoning
    const reasoning = this.generateReasoning(
      source,
      learningStatus,
      historicalDataPoints,
      dataCompleteness,
      dataFreshness
    );

    return {
      isValid,
      source: source.type,
      confidence: source.confidence,
      learningStatus,
      reasoning,
      dataQuality: {
        hasHistoricalData: historicalDataPoints > 0,
        historicalDataPoints,
        dataCompleteness,
        dataFreshness,
      },
      validationErrors: errors,
      warnings,
    };
  }

  /**
   * Generate reasoning for forecast
   */
  private generateReasoning(
    source: ForecastSource,
    learningStatus: string,
    historicalDataPoints: number,
    dataCompleteness: number,
    dataFreshness: number
  ): string {
    const parts: string[] = [];

    // Source reasoning
    switch (source.type) {
      case 'ml':
        parts.push(`ML Model: ${source.model || 'XGBoost/LightGBM Ensemble'}`);
        if (source.version) {
          parts.push(`Version: ${source.version}`);
        }
        if (source.trainedOn) {
          const daysOld = Math.floor((Date.now() - source.trainedOn) / (1000 * 60 * 60 * 24));
          parts.push(`Trained ${daysOld} days ago`);
        }
        if (source.accuracy) {
          parts.push(`Accuracy: ${(source.accuracy * 100).toFixed(1)}%`);
        }
        break;

      case 'heuristic':
        parts.push('Heuristic baseline (rule-based estimation)');
        break;

      case 'fallback':
        parts.push('Fallback mode (ML service unavailable)');
        break;
    }

    // Learning status reasoning
    switch (learningStatus) {
      case 'early_learning':
        parts.push(`Early learning phase (${historicalDataPoints} data points)`);
        parts.push('Predictions may have higher variance');
        break;

      case 'learning':
        parts.push(`Learning phase (${historicalDataPoints} data points)`);
        parts.push('Model improving with more data');
        break;

      case 'trained':
        parts.push(`Trained model (${historicalDataPoints} data points)`);
        parts.push('Stable predictions expected');
        break;

      case 'production':
        parts.push(`Production model (${historicalDataPoints} data points)`);
        parts.push('High accuracy predictions');
        break;

      case 'fallback_mode':
        parts.push('Fallback mode active');
        parts.push('Using historical baseline');
        break;
    }

    // Data quality reasoning
    if (dataCompleteness < 0.8) {
      parts.push(`Data completeness: ${(dataCompleteness * 100).toFixed(1)}% (some gaps present)`);
    }

    if (dataFreshness < 0.5) {
      parts.push('Data freshness: older data included');
    }

    return parts.join(' | ');
  }

  /**
   * Verify forecast is not fake
   */
  verifyForecastIsReal(forecast: any, source: ForecastSource): {
    isReal: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for hardcoded values (only for round numbers like 50, 100)
    if (this.isLikelyHardcoded(forecast.demand) && forecast.demand >= 50) {
      issues.push('Forecast demand appears to be hardcoded');
    }

    // Check for missing source information
    if (!source || !source.type) {
      issues.push('Forecast source is missing');
    }

    // Check for missing confidence
    if (!forecast.confidence) {
      issues.push('Forecast confidence is missing');
    }

    // Check for missing reasoning (must be meaningful)
    if (!forecast.reasoning || forecast.reasoning.length < 5) {
      issues.push('Forecast reasoning is missing or too brief');
    }

    // Check for missing learning status
    if (!forecast.learningStatus) {
      issues.push('Forecast learning status is missing');
    }

    return {
      isReal: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if value is likely hardcoded
   */
  private isLikelyHardcoded(value: number): boolean {
    // Common hardcoded values (only very round numbers)
    const suspiciousValues = [0, 1, 50, 100, 99, 42, 123];
    return suspiciousValues.includes(value);
  }

  /**
   * Generate validation report
   */
  generateValidationReport(
    forecast: any,
    validation: ForecastValidation,
    realityCheck: { isReal: boolean; issues: string[] }
  ): string {
    const lines: string[] = [];

    lines.push('=== FORECAST VALIDATION REPORT ===');
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push('');

    lines.push('VALIDATION STATUS:');
    lines.push(`  Valid: ${validation.isValid ? '✅ YES' : '❌ NO'}`);
    lines.push(`  Real: ${realityCheck.isReal ? '✅ YES' : '❌ NO'}`);
    lines.push('');

    lines.push('FORECAST SOURCE:');
    lines.push(`  Type: ${validation.source}`);
    lines.push(`  Confidence: ${validation.confidence}`);
    lines.push(`  Learning Status: ${validation.learningStatus}`);
    lines.push('');

    lines.push('DATA QUALITY:');
    lines.push(`  Historical Points: ${validation.dataQuality.historicalDataPoints}`);
    lines.push(`  Completeness: ${(validation.dataQuality.dataCompleteness * 100).toFixed(1)}%`);
    lines.push(`  Freshness: ${(validation.dataQuality.dataFreshness * 100).toFixed(1)}%`);
    lines.push('');

    lines.push('REASONING:');
    lines.push(`  ${validation.reasoning}`);
    lines.push('');

    if (validation.validationErrors.length > 0) {
      lines.push('ERRORS:');
      validation.validationErrors.forEach((error) => {
        lines.push(`  ❌ ${error}`);
      });
      lines.push('');
    }

    if (validation.warnings.length > 0) {
      lines.push('WARNINGS:');
      validation.warnings.forEach((warning) => {
        lines.push(`  ⚠️ ${warning}`);
      });
      lines.push('');
    }

    if (realityCheck.issues.length > 0) {
      lines.push('REALITY CHECK ISSUES:');
      realityCheck.issues.forEach((issue) => {
        lines.push(`  ⚠️ ${issue}`);
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Should forecast be shown to user
   */
  shouldShowForecast(validation: ForecastValidation, realityCheck: { isReal: boolean }): boolean {
    // Only show if:
    // 1. Forecast is real (not hardcoded)
    // 2. Forecast is valid
    // 3. Has sufficient data or is in learning mode
    return (
      realityCheck.isReal &&
      validation.isValid &&
      (validation.dataQuality.historicalDataPoints >= this.MIN_HISTORICAL_POINTS ||
        validation.learningStatus === 'early_learning')
    );
  }

  /**
   * Get forecast disclaimer
   */
  getForecastDisclaimer(validation: ForecastValidation): string {
    switch (validation.learningStatus) {
      case 'early_learning':
        return '🔵 Early Learning: This forecast is based on limited data. Accuracy will improve as more orders are processed.';

      case 'learning':
        return '🟡 Learning Phase: This forecast is improving. Confidence will increase with more data.';

      case 'trained':
        return '🟢 Trained Model: This forecast is based on trained ML model with good accuracy.';

      case 'production':
        return '✅ Production Ready: This forecast is based on a highly accurate production model.';

      case 'fallback_mode':
        return '⚠️ Fallback Mode: ML service is unavailable. Using historical baseline.';

      default:
        return 'Forecast source unknown.';
    }
  }
}

// Export singleton instance
export const forecastValidator = new ForecastValidator();
