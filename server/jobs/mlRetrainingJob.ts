/**
 * ML Retraining Job
 * Scheduled daily job to retrain ML models with new data
 */

import { logger } from '../utils/logger';
import { mlServiceClient } from '../ml/mlServiceClient';
import { getDb } from '../db';
import { orders } from '../db/schema';
import { sql } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

interface RetrainingConfig {
  enabled: boolean;
  scheduleTime: string; // HH:MM format (UTC)
  lookbackDays: number;
  zones: string[];
  autoDeployThreshold: number; // Improvement % required to auto-deploy
}

interface RetrainingResult {
  zone_id: string;
  status: 'success' | 'failed' | 'skipped';
  model_id?: string;
  previous_metrics?: Record<string, number>;
  new_metrics?: Record<string, number>;
  improvement?: number;
  error?: string;
}

/**
 * ML Retraining Job
 */
export class MLRetrainingJob {
  private config: RetrainingConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<RetrainingConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      scheduleTime: config.scheduleTime ?? '02:00', // 2 AM UTC
      lookbackDays: config.lookbackDays ?? 90,
      zones: config.zones ?? [],
      autoDeployThreshold: config.autoDeployThreshold ?? 0.02, // 2%
    };
  }

  /**
   * Run retraining job
   */
  async run(): Promise<RetrainingResult[]> {
    if (!this.config.enabled) {
      logger.info('ML retraining job is disabled');
      return [];
    }

    if (this.isRunning) {
      logger.warn('ML retraining job is already running');
      return [];
    }

    this.isRunning = true;
    const results: RetrainingResult[] = [];

    try {
      logger.info('Starting ML retraining job');

      // Get list of zones to retrain
      const zones = await this.getZonesToRetrain();

      if (zones.length === 0) {
        logger.warn('No zones found for retraining');
        this.isRunning = false;
        return results;
      }

      logger.info(`Retraining ${zones.length} zones`);

      // Retrain each zone
      for (const zone_id of zones) {
        try {
          const result = await this.retrainZone(zone_id);
          results.push(result);
        } catch (error) {
          logger.error(`Retraining failed for zone ${zone_id}:`, error);
          results.push({
            zone_id,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Send summary notification
      await this.sendSummaryNotification(results);

      logger.info(`ML retraining job completed: ${results.length} zones processed`);
    } catch (error) {
      logger.error('ML retraining job failed:', error);
      await notifyOwner({
        title: 'ML Retraining Job Failed',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Retrain a single zone
   */
  private async retrainZone(zone_id: string): Promise<RetrainingResult> {
    logger.info(`Retraining zone ${zone_id}`);

    try {
      // Get current model metrics
      const currentMetrics = await mlServiceClient.getMetrics({
        zone_id,
      });

      // Start training
      const training = await mlServiceClient.train({
        zone_id,
        lookback_days: this.config.lookbackDays,
        force_retrain: false,
      });

      logger.info(`Training job ${training.model_id} started for zone ${zone_id}`);

      // Wait for training to complete (with timeout)
      const newMetrics = await this.waitForTrainingCompletion(
        training.model_id,
        300000 // 5 minute timeout
      );

      if (!newMetrics) {
        return {
          zone_id,
          status: 'failed',
          error: 'Training timeout',
        };
      }

      // Calculate improvement
      const improvement = this.calculateImprovement(currentMetrics, newMetrics);

      logger.info(
        `Zone ${zone_id} retraining completed. Improvement: ${(improvement * 100).toFixed(2)}%`
      );

      // Auto-deploy if improvement exceeds threshold
      if (improvement > this.config.autoDeployThreshold) {
        logger.info(`Auto-deploying model ${training.model_id} for zone ${zone_id}`);
        // In production, this would activate the model
      }

      return {
        zone_id,
        status: 'success',
        model_id: training.model_id,
        previous_metrics: currentMetrics,
        new_metrics: newMetrics,
        improvement,
      };
    } catch (error) {
      logger.error(`Retraining failed for zone ${zone_id}:`, error);
      return {
        zone_id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Wait for training to complete
   */
  private async waitForTrainingCompletion(
    model_id: string,
    timeout: number
  ): Promise<Record<string, number> | null> {
    const startTime = Date.now();
    const pollInterval = 5000; // 5 seconds

    while (Date.now() - startTime < timeout) {
      try {
        const status = await mlServiceClient.getTrainingStatus(model_id);

        if (status.status === 'completed') {
          return status.metrics || {};
        } else if (status.status === 'failed') {
          logger.error(`Training job ${model_id} failed`);
          return null;
        }

        // Still training, wait before checking again
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        logger.warn(`Error checking training status: ${error}`);
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    logger.warn(`Training job ${model_id} timeout`);
    return null;
  }

  /**
   * Calculate improvement between metrics
   */
  private calculateImprovement(
    oldMetrics: Record<string, number>,
    newMetrics: Record<string, number>
  ): number {
    // Lower MAE is better
    const oldMAE = oldMetrics.mae || 10;
    const newMAE = newMetrics.mae || 10;

    if (oldMAE === 0) return 0;

    const improvement = (oldMAE - newMAE) / oldMAE;
    return Math.max(improvement, 0); // Don't return negative improvement
  }

  /**
   * Get zones to retrain
   */
  private async getZonesToRetrain(): Promise<string[]> {
    try {
      if (this.config.zones.length > 0) {
        return this.config.zones;
      }

      // Get unique zones from recent orders
      const db = getDb();
      if (!db) return [];

      const result = await db
        .selectDistinct({ zone_id: orders.zone_id })
        .from(orders)
        .where(sql`${orders.created_at} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`)
        .limit(10);

      return result.map((r: any) => r.zone_id).filter((z: any) => z);
    } catch (error) {
      logger.error('Failed to get zones for retraining:', error);
      return [];
    }
  }

  /**
   * Send summary notification
   */
  private async sendSummaryNotification(results: RetrainingResult[]): Promise<void> {
    try {
      const successCount = results.filter((r) => r.status === 'success').length;
      const failedCount = results.filter((r) => r.status === 'failed').length;

      const avgImprovement =
        results
          .filter((r) => r.improvement !== undefined)
          .reduce((sum, r) => sum + (r.improvement || 0), 0) /
        Math.max(
          results.filter((r) => r.improvement !== undefined).length,
          1
        );

      const content = `
ML Retraining Summary:
- Successful: ${successCount}
- Failed: ${failedCount}
- Average Improvement: ${(avgImprovement * 100).toFixed(2)}%

Details:
${results.map((r) => `- ${r.zone_id}: ${r.status}${r.improvement ? ` (${(r.improvement * 100).toFixed(2)}% improvement)` : ''}`).join('\n')}
      `.trim();

      await notifyOwner({
        title: 'ML Retraining Job Completed',
        content,
      });
    } catch (error) {
      logger.error('Failed to send summary notification:', error);
    }
  }

  /**
   * Check if job should run now
   */
  shouldRunNow(): boolean {
    if (!this.config.enabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getUTCHours()).padStart(2, '0')}:${String(
      now.getUTCMinutes()
    ).padStart(2, '0')}`;

    // Run if current time is within 5 minutes of scheduled time
    const [schedHour, schedMin] = this.config.scheduleTime.split(':').map(Number);
    const schedTime = schedHour * 60 + schedMin;
    const currentTimeMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    return Math.abs(currentTimeMinutes - schedTime) < 5;
  }

  /**
   * Get job status
   */
  getStatus(): {
    enabled: boolean;
    isRunning: boolean;
    scheduleTime: string;
    lookbackDays: number;
    zones: string[];
  } {
    return {
      enabled: this.config.enabled,
      isRunning: this.isRunning,
      scheduleTime: this.config.scheduleTime,
      lookbackDays: this.config.lookbackDays,
      zones: this.config.zones,
    };
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<RetrainingConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('ML retraining job configuration updated:', this.config);
  }
}

// Export singleton instance
export const mlRetrainingJob = new MLRetrainingJob();
