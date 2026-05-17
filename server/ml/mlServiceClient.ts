/**
 * ML Service Client
 * Communicates with Python ML service via HTTP
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

// Simple console logger if utils/logger not available
const consoleLogger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data),
};

export interface PredictionRequest {
  zone_id: string;
  forecast_time: string;
  active_drivers?: number;
  current_backlog?: number;
  weather_condition?: string;
  weather_severity?: number;
  active_events?: number;
  event_intensity?: number;
  zone_density?: number;
}

export interface PredictionResponse {
  predicted_demand: number;
  confidence: number;
  interval_lower: number;
  interval_upper: number;
  top_features: Array<{
    name: string;
    importance: number;
    value: number;
  }>;
  explanation: string;
  model_version: string;
  prediction_timestamp: string;
}

export interface TrainingRequest {
  zone_id: string;
  lookback_days?: number;
  force_retrain?: boolean;
}

export interface TrainingResponse {
  model_id: string;
  zone_id: string;
  status: string;
  eta_seconds?: number;
  metrics?: Record<string, number>;
}

export interface MetricsRequest {
  model_id?: string;
  zone_id?: string;
  lookback_days?: number;
}

export interface MetricsResponse {
  model_id: string;
  mae: number;
  rmse: number;
  mape: number;
  pi_coverage: number;
  pi_width: number;
  validation_date: string;
  training_samples: number;
}

export interface RollbackRequest {
  zone_id: string;
  target_version: string;
}

export interface RollbackResponse {
  status: string;
  previous_version: string;
  current_version: string;
  rollback_timestamp: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  models_loaded: number;
}

/**
 * ML Service Client
 */
export class MLServiceClient {
  private client: AxiosInstance;
  private baseURL: string;
  private timeout: number = 30000;
  private retries: number = 3;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        if (!config || !config.retry) {
          config.retry = 0;
        }

        config.retry += 1;

        if (config.retry <= this.retries && error.response?.status >= 500) {
          logger.warn(
            `ML Service request failed, retrying (${config.retry}/${this.retries})`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * config.retry));
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Health check
   */
  async health(): Promise<HealthResponse> {
    try {
      const response = await this.client.get<HealthResponse>('/health');
      return response.data;
    } catch (error) {
      logger.error('ML Service health check failed:', error);
      throw error;
    }
  }

  /**
   * Predict demand
   */
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    try {
      logger.info(`ML prediction for zone ${request.zone_id}`);
      const response = await this.client.post<PredictionResponse>(
        '/api/ml/predict',
        request
      );
      return response.data;
    } catch (error) {
      logger.error('ML prediction failed:', error);
      throw error;
    }
  }

  /**
   * Batch predict
   */
  async predictBatch(
    zone_id: string,
    requests: PredictionRequest[]
  ): Promise<PredictionResponse[]> {
    try {
      logger.info(`ML batch prediction for zone ${zone_id} (${requests.length} items)`);
      const predictions = await Promise.all(
        requests.map((req) => this.predict(req))
      );
      return predictions;
    } catch (error) {
      logger.error('ML batch prediction failed:', error);
      throw error;
    }
  }

  /**
   * Train model
   */
  async train(request: TrainingRequest): Promise<TrainingResponse> {
    try {
      logger.info(`ML training for zone ${request.zone_id}`);
      const response = await this.client.post<TrainingResponse>(
        '/api/ml/train',
        request
      );
      return response.data;
    } catch (error) {
      logger.error('ML training failed:', error);
      throw error;
    }
  }

  /**
   * Get training status
   */
  async getTrainingStatus(model_id: string): Promise<TrainingResponse> {
    try {
      const response = await this.client.get<TrainingResponse>(
        `/api/ml/train/${model_id}`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get training status:', error);
      throw error;
    }
  }

  /**
   * Get metrics
   */
  async getMetrics(request: MetricsRequest): Promise<MetricsResponse> {
    try {
      const response = await this.client.post<MetricsResponse>(
        '/api/ml/metrics',
        request
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get metrics:', error);
      throw error;
    }
  }

  /**
   * Rollback model
   */
  async rollback(request: RollbackRequest): Promise<RollbackResponse> {
    try {
      logger.info(`ML rollback for zone ${request.zone_id}`);
      const response = await this.client.post<RollbackResponse>(
        '/api/ml/rollback',
        request
      );
      return response.data;
    } catch (error) {
      logger.error('ML rollback failed:', error);
      throw error;
    }
  }

  /**
   * List models for zone
   */
  async listModels(zone_id: string): Promise<any[]> {
    try {
      const response = await this.client.get(`/api/ml/models/${zone_id}`);
      return response.data.models || [];
    } catch (error) {
      logger.error('Failed to list models:', error);
      throw error;
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(zone_id: string, model_id: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/api/ml/models/${zone_id}/${model_id}`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get model info:', error);
      throw error;
    }
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.health();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Set base URL (for dynamic configuration)
   */
  setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }

  /**
   * Set timeout
   */
  setTimeout(timeout: number): void {
    this.timeout = timeout;
    this.client.defaults.timeout = timeout;
  }
}

// Export singleton instance
export const mlServiceClient = new MLServiceClient(
  process.env.ML_SERVICE_URL || 'http://localhost:8000'
);
