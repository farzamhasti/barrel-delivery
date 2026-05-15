/**
 * Temporal Feature Engineering for ML Model Training
 * 
 * Extracts temporal features that help ML models learn distinct demand patterns
 * for different days of the week and times of day within operating hours.
 */

import {
  OPERATING_HOURS,
  PEAK_HOURS,
  PRE_CLOSING_SURGE,
  DayCategory,
  getDayCategory,
  getOperatingHoursForDay,
  isDuringPeakHours,
  isDuringPreClosingSurge,
} from './operatingHours';

/**
 * Temporal features for ML model training
 */
export interface TemporalFeatures {
  // Day-of-week features
  dayOfWeek: number;                    // 0-6 (0=Sunday, 6=Saturday)
  dayCategory: DayCategory;             // 'weekday', 'friday', 'saturday'
  isWeekend: boolean;                   // true if Friday or Saturday
  
  // Hour features
  hour: number;                         // 16-22 (weekdays) or 16-23 (Fri/Sat)
  minute: number;                       // 0-59
  
  // Operating hours features
  hoursSinceOpen: number;               // 0-6 (weekdays) or 0-7 (Fri/Sat)
  minutesUntilClose: number;            // 0-360 (weekdays) or 0-420 (Fri/Sat)
  percentThroughDay: number;            // 0.0-1.0 (0% at open, 100% at close)
  
  // Peak hour features
  isPeakHour: boolean;                  // true if in any peak hour window
  peakHourType: 'early' | 'main' | 'late' | 'none';  // Type of peak hour
  isEarlyPeak: boolean;                 // 5-7 PM
  isMainPeak: boolean;                  // 7-9 PM
  isLatePeak: boolean;                  // 9-10 PM (weekdays) or 9-11 PM (Fri/Sat)
  
  // Pre-closing features
  isPreClosingSurge: boolean;           // Last 30 minutes before close
  minutesUntilClose30: boolean;         // true if within last 30 minutes
  minutesUntilClose15: boolean;         // true if within last 15 minutes
  minutesUntilClose5: boolean;          // true if within last 5 minutes
  
  // Cyclical encoding for hour (sine/cosine for circular nature)
  hourSine: number;                     // sin(2π * hour / 24)
  hourCosine: number;                   // cos(2π * hour / 24)
  
  // Cyclical encoding for day (sine/cosine for weekly cycle)
  daySine: number;                      // sin(2π * dayOfWeek / 7)
  dayCosine: number;                    // cos(2π * dayOfWeek / 7)
  
  // Demand pattern indicators
  isHighDemandWindow: boolean;          // true if in peak or pre-closing surge
  demandIntensity: number;              // 0.0-1.0 (0=low, 1=high)
}

/**
 * Extract comprehensive temporal features for a given time
 * @param date Date to extract features from
 * @returns TemporalFeatures object for ML model training
 */
export function extractTemporalFeaturesForML(date: Date = new Date()): TemporalFeatures {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const dayCategory = getDayCategory(date);
  const { openHour, closeHour } = getOperatingHoursForDay(dayOfWeek);
  
  // Calculate hours and minutes since open
  const hoursSinceOpen = hour - openHour;
  const minutesSinceOpen = hoursSinceOpen * 60 + minute;
  const totalMinutesInDay = (closeHour - openHour) * 60;
  const minutesUntilClose = totalMinutesInDay - minutesSinceOpen;
  
  // Peak hour detection
  const isPeak = isDuringPeakHours(date);
  const isPreClosing = isDuringPreClosingSurge(date);
  
  // Determine peak hour type
  let peakHourType: 'early' | 'main' | 'late' | 'none' = 'none';
  let isEarlyPeak = false;
  let isMainPeak = false;
  let isLatePeak = false;
  
  if (isPeak) {
    if (hour >= PEAK_HOURS.EARLY_PEAK.start && hour < PEAK_HOURS.EARLY_PEAK.end) {
      peakHourType = 'early';
      isEarlyPeak = true;
    } else if (hour >= PEAK_HOURS.MAIN_PEAK.start && hour < PEAK_HOURS.MAIN_PEAK.end) {
      peakHourType = 'main';
      isMainPeak = true;
    } else {
      peakHourType = 'late';
      isLatePeak = true;
    }
  }
  
  // Pre-closing surge windows
  const minutesUntilClose30 = minutesUntilClose <= 30;
  const minutesUntilClose15 = minutesUntilClose <= 15;
  const minutesUntilClose5 = minutesUntilClose <= 5;
  
  // Cyclical encoding (sine/cosine for circular features)
  const hourSine = Math.sin((2 * Math.PI * hour) / 24);
  const hourCosine = Math.cos((2 * Math.PI * hour) / 24);
  const daySine = Math.sin((2 * Math.PI * dayOfWeek) / 7);
  const dayCosine = Math.cos((2 * Math.PI * dayOfWeek) / 7);
  
  // Percent through day (0.0 at open, 1.0 at close)
  const percentThroughDay = minutesSinceOpen / totalMinutesInDay;
  
  // High demand window indicator
  const isHighDemandWindow = isPeak || isPreClosing;
  
  // Demand intensity calculation (0.0 to 1.0)
  let demandIntensity = 0.0;
  if (isMainPeak) {
    demandIntensity = 0.9; // Main peak: highest demand (7-9 PM)
  } else if (isLatePeak && isPreClosing) {
    demandIntensity = 0.85; // Late peak + pre-closing: very high demand
  } else if (isLatePeak) {
    demandIntensity = 0.8; // Late peak: high demand (9-10 PM weekdays, 9-11 PM Fri/Sat)
  } else if (isEarlyPeak) {
    demandIntensity = 0.6; // Early peak: moderate-high demand (5-7 PM)
  } else if (isPreClosing) {
    demandIntensity = 0.75; // Pre-closing surge: high demand
  } else if (hoursSinceOpen < 1) {
    demandIntensity = 0.3; // First hour: low demand (ramp-up)
  } else if (minutesUntilClose < 60) {
    demandIntensity = 0.5; // Last hour (not pre-closing): medium demand (wind-down)
  } else {
    demandIntensity = 0.4; // Regular hours: low-medium demand
  }
  
  return {
    dayOfWeek,
    dayCategory,
    isWeekend: dayOfWeek === 5 || dayOfWeek === 6,
    hour,
    minute,
    hoursSinceOpen,
    minutesUntilClose,
    percentThroughDay,
    isPeakHour: isPeak,
    peakHourType,
    isEarlyPeak,
    isMainPeak,
    isLatePeak,
    isPreClosingSurge: isPreClosing,
    minutesUntilClose30,
    minutesUntilClose15,
    minutesUntilClose5,
    hourSine,
    hourCosine,
    daySine,
    dayCosine,
    isHighDemandWindow,
    demandIntensity,
  };
}

/**
 * Normalize temporal features for ML model input
 * Scales features to 0-1 range for better model performance
 */
export function normalizeTemporalFeatures(features: TemporalFeatures): Record<string, number> {
  return {
    // Normalize day of week (0-6 -> 0-1)
    dayOfWeek_norm: features.dayOfWeek / 6,
    
    // Normalize hour (16-23 -> 0-1)
    hour_norm: (features.hour - 16) / 7,
    
    // Normalize minutes (0-59 -> 0-1)
    minute_norm: features.minute / 59,
    
    // Hours since open already normalized (0-7 -> 0-1)
    hoursSinceOpen_norm: features.hoursSinceOpen / 7,
    
    // Minutes until close already normalized (0-420 -> 0-1)
    minutesUntilClose_norm: Math.min(features.minutesUntilClose / 420, 1.0),
    
    // Percent through day already normalized (0-1)
    percentThroughDay: features.percentThroughDay,
    
    // Boolean features (0 or 1)
    isPeakHour: features.isPeakHour ? 1 : 0,
    isEarlyPeak: features.isEarlyPeak ? 1 : 0,
    isMainPeak: features.isMainPeak ? 1 : 0,
    isLatePeak: features.isLatePeak ? 1 : 0,
    isPreClosingSurge: features.isPreClosingSurge ? 1 : 0,
    isWeekend: features.isWeekend ? 1 : 0,
    minutesUntilClose30: features.minutesUntilClose30 ? 1 : 0,
    minutesUntilClose15: features.minutesUntilClose15 ? 1 : 0,
    minutesUntilClose5: features.minutesUntilClose5 ? 1 : 0,
    isHighDemandWindow: features.isHighDemandWindow ? 1 : 0,
    
    // Cyclical features already normalized (-1 to 1, but normalize to 0-1)
    hourSine_norm: (features.hourSine + 1) / 2,
    hourCosine_norm: (features.hourCosine + 1) / 2,
    daySine_norm: (features.daySine + 1) / 2,
    dayCosine_norm: (features.dayCosine + 1) / 2,
    
    // Demand intensity already normalized (0-1)
    demandIntensity: features.demandIntensity,
  };
}

/**
 * Get feature importance weights for different demand patterns
 * Helps prioritize which features matter most for predictions
 */
export function getFeatureImportanceWeights(): Record<string, number> {
  // Normalized to sum to 1.0 (original weights / 1.13)
  return {
    // Most important: peak hour indicators
    isPeakHour: 0.1327,
    isMainPeak: 0.1062,
    demandIntensity: 0.1062,
    
    // Important: time-based features
    hoursSinceOpen_norm: 0.0885,
    percentThroughDay: 0.0885,
    minutesUntilClose_norm: 0.0708,
    
    // Moderately important: day category
    dayOfWeek_norm: 0.0708,
    isWeekend: 0.0619,
    
    // Moderately important: surge indicators
    isPreClosingSurge: 0.0531,
    isHighDemandWindow: 0.0442,
    
    // Less important: fine-grained time details
    isEarlyPeak: 0.0265,
    isLatePeak: 0.0265,
    minutesUntilClose30: 0.0177,
    minutesUntilClose15: 0.0088,
    minutesUntilClose5: 0.0088,
    
    // Cyclical encodings (used for pattern learning)
    hourSine_norm: 0.0177,
    hourCosine_norm: 0.0177,
    daySine_norm: 0.0177,
    dayCosine_norm: 0.0177,
    
    // Minute-level detail (low importance)
    hour_norm: 0.0088,
    minute_norm: 0.0088,
  };
}

/**
 * Create a feature vector for ML model input
 * Combines normalized features in a consistent order
 */
export function createFeatureVector(date: Date = new Date()): number[] {
  const features = extractTemporalFeaturesForML(date);
  const normalized = normalizeTemporalFeatures(features);
  
  // Return features in a consistent order for ML model
  return [
    normalized.dayOfWeek_norm,
    normalized.hour_norm,
    normalized.minute_norm,
    normalized.hoursSinceOpen_norm,
    normalized.minutesUntilClose_norm,
    normalized.percentThroughDay,
    normalized.isPeakHour,
    normalized.isEarlyPeak,
    normalized.isMainPeak,
    normalized.isLatePeak,
    normalized.isPreClosingSurge,
    normalized.isWeekend,
    normalized.minutesUntilClose30,
    normalized.minutesUntilClose15,
    normalized.minutesUntilClose5,
    normalized.isHighDemandWindow,
    normalized.hourSine_norm,
    normalized.hourCosine_norm,
    normalized.daySine_norm,
    normalized.dayCosine_norm,
    normalized.demandIntensity,
  ];
}

/**
 * Get feature names for feature vector
 * Useful for model interpretation and debugging
 */
export function getFeatureNames(): string[] {
  return [
    'dayOfWeek_norm',
    'hour_norm',
    'minute_norm',
    'hoursSinceOpen_norm',
    'minutesUntilClose_norm',
    'percentThroughDay',
    'isPeakHour',
    'isEarlyPeak',
    'isMainPeak',
    'isLatePeak',
    'isPreClosingSurge',
    'isWeekend',
    'minutesUntilClose30',
    'minutesUntilClose15',
    'minutesUntilClose5',
    'isHighDemandWindow',
    'hourSine_norm',
    'hourCosine_norm',
    'daySine_norm',
    'dayCosine_norm',
    'demandIntensity',
  ];
}

/**
 * Batch extract features for multiple timestamps
 * Useful for training data preparation
 */
export function batchExtractTemporalFeatures(dates: Date[]): TemporalFeatures[] {
  return dates.map(date => extractTemporalFeaturesForML(date));
}

/**
 * Batch create feature vectors for multiple timestamps
 * Returns matrix of shape [n_samples, n_features]
 */
export function batchCreateFeatureVectors(dates: Date[]): number[][] {
  return dates.map(date => createFeatureVector(date));
}
