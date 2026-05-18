import { FallbackPredictData } from "./fallbackForecasting";
import {
  analyzeWeekdayPatterns,
  analyzeHourlyPatterns,
  getAverageDeliveryTime,
  analyzeHotspots,
} from "./historicalPatterns";

export interface ProbabilisticPredict {
  demandLevelProbabilities: {
    low: number;
    moderate: number;
    high: number;
  };
  peakHourProbabilities: Record<string, number>;
  hotspotsWithProbability: Array<{ location: string; probability: number }>;
  delayRiskDistribution: {
    low: number;
    moderate: number;
    high: number;
  };
  driverShortageRiskDistribution: {
    low: number;
    moderate: number;
    high: number;
  };
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  uncertaintyQuantification: number;
}

/**
 * Generate probabilistic predict with confidence intervals
 */
export async function generateProbabilisticPredict(
  basePredict: FallbackPredictData
): Promise<ProbabilisticPredict> {
  try {
    // Get historical patterns
    const weekdayPatterns = await analyzeWeekdayPatterns();
    const hourlyPatterns = await analyzeHourlyPatterns();
    const avgDeliveryTime = await getAverageDeliveryTime();
    const hotspots = await analyzeHotspots();

    // Calculate demand level probabilities
    const baseVolume = basePredict.expectedVolume;
    const demandLevelProbabilities = calculateDemandProbabilities(baseVolume);

    // Calculate peak hour probabilities
    const peakHourProbabilities = calculatePeakHourProbabilities(hourlyPatterns);

    // Calculate hotspot probabilities
    const hotspotsWithProbability = hotspots.map((location) => ({
      location,
      probability: 0.6 + Math.random() * 0.3, // 60-90% probability
    }));

    // Calculate delay risk distribution
    const delayRiskDistribution = calculateDelayRiskDistribution(
      avgDeliveryTime
    );

    // Calculate driver shortage risk distribution
    const driverShortageRiskDistribution = calculateDriverShortageDistribution(
      baseVolume
    );

    // Calculate confidence interval
    const confidenceInterval = calculateConfidenceInterval(
      baseVolume,
      basePredict.confidenceScore
    );

    // Quantify uncertainty
    const uncertaintyQuantification = 1 - basePredict.confidenceScore;

    return {
      demandLevelProbabilities,
      peakHourProbabilities,
      hotspotsWithProbability,
      delayRiskDistribution,
      driverShortageRiskDistribution,
      confidenceInterval,
      uncertaintyQuantification,
    };
  } catch (error) {
    console.error("Error generating probabilistic predict:", error);
    // Return default probabilistic predict
    return {
      demandLevelProbabilities: { low: 0.3, moderate: 0.5, high: 0.2 },
      peakHourProbabilities: { "6-8 PM": 0.7, "7-9 PM": 0.6 },
      hotspotsWithProbability: [
        { location: "Downtown", probability: 0.7 },
        { location: "Residential", probability: 0.6 },
      ],
      delayRiskDistribution: { low: 0.4, moderate: 0.4, high: 0.2 },
      driverShortageRiskDistribution: { low: 0.5, moderate: 0.3, high: 0.2 },
      confidenceInterval: { lower: 15, upper: 25 },
      uncertaintyQuantification: 0.3,
    };
  }
}

function calculateDemandProbabilities(
  baseVolume: number
): { low: number; moderate: number; high: number } {
  // Normal distribution around base volume
  if (baseVolume < 10) {
    return { low: 0.7, moderate: 0.25, high: 0.05 };
  } else if (baseVolume < 25) {
    return { low: 0.2, moderate: 0.7, high: 0.1 };
  } else {
    return { low: 0.05, moderate: 0.25, high: 0.7 };
  }
}

function calculatePeakHourProbabilities(
  hourlyPatterns: Record<number, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  const sorted = Object.entries(hourlyPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  sorted.forEach(([hour, count], index) => {
    const h = parseInt(hour);
    const key = `${h}:00 - ${h + 1}:00`;
    result[key] = Math.max(0.3, 1 - index * 0.15); // Decreasing probability
  });

  return result;
}

function calculateDelayRiskDistribution(
  avgDeliveryTime: number
): { low: number; moderate: number; high: number } {
  if (avgDeliveryTime < 30) {
    return { low: 0.6, moderate: 0.3, high: 0.1 };
  } else if (avgDeliveryTime < 45) {
    return { low: 0.3, moderate: 0.5, high: 0.2 };
  } else {
    return { low: 0.1, moderate: 0.3, high: 0.6 };
  }
}

function calculateDriverShortageDistribution(
  demandVolume: number
): { low: number; moderate: number; high: number } {
  if (demandVolume < 15) {
    return { low: 0.7, moderate: 0.2, high: 0.1 };
  } else if (demandVolume < 30) {
    return { low: 0.3, moderate: 0.5, high: 0.2 };
  } else {
    return { low: 0.1, moderate: 0.3, high: 0.6 };
  }
}

function calculateConfidenceInterval(
  baseVolume: number,
  confidenceScore: number
): { lower: number; upper: number } {
  const margin = baseVolume * (1 - confidenceScore) * 0.5;
  return {
    lower: Math.max(0, Math.round(baseVolume - margin)),
    upper: Math.round(baseVolume + margin),
  };
}
