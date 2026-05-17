/**
 * ML Monitoring Dashboard
 * Displays ML model performance, training status, and metrics
 */

import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface ModelMetrics {
  model_id: string;
  mae: number;
  rmse: number;
  mape: number;
  pi_coverage: number;
  pi_width: number;
  validation_date: string;
  training_samples: number;
}

interface TrainingJob {
  model_id: string;
  zone_id: string;
  status: 'queued' | 'training' | 'completed' | 'failed';
  eta_seconds?: number;
  metrics?: Record<string, number>;
}

export const MLMonitoringDashboard: React.FC<{ zone_id: string }> = ({ zone_id }) => {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<'mae' | 'rmse' | 'mape'>('mae');

  // Fetch metrics
  const metricsQuery = trpc.ml.getMetrics.useQuery(
    { zone_id },
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      enabled: !!zone_id,
    }
  );

  // Train model mutation
  const trainMutation = trpc.ml.train.useMutation({
    onSuccess: (data) => {
      setTrainingJobs([...trainingJobs, data as TrainingJob]);
      setIsTraining(true);
    },
    onError: (error) => {
      console.error('Training failed:', error);
    },
  });

  // Health check
  const healthQuery = trpc.ml.health.useQuery(undefined, {
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  useEffect(() => {
    if (metricsQuery.data) {
      setMetrics(metricsQuery.data as ModelMetrics);
    }
  }, [metricsQuery.data]);

  const handleTrain = async () => {
    await trainMutation.mutateAsync({
      zone_id,
      lookback_days: 90,
      force_retrain: false,
    });
  };

  const getMetricValue = (metric: ModelMetrics, type: 'mae' | 'rmse' | 'mape'): string => {
    switch (type) {
      case 'mae':
        return metric.mae.toFixed(2);
      case 'rmse':
        return metric.rmse.toFixed(2);
      case 'mape':
        return `${metric.mape.toFixed(1)}%`;
      default:
        return '0';
    }
  };

  const getMetricDescription = (type: 'mae' | 'rmse' | 'mape'): string => {
    switch (type) {
      case 'mae':
        return 'Mean Absolute Error (lower is better)';
      case 'rmse':
        return 'Root Mean Squared Error (lower is better)';
      case 'mape':
        return 'Mean Absolute Percentage Error (lower is better)';
      default:
        return '';
    }
  };

  const isHealthy = healthQuery.data?.status === 'healthy';

  return (
    <div className="space-y-6">
      {/* Service Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            ML Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Status</span>
              <Badge variant={isHealthy ? 'default' : 'destructive'}>
                {isHealthy ? 'Healthy' : 'Unhealthy'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Models Loaded</span>
              <span className="text-sm">{healthQuery.data?.models_loaded || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Last Check</span>
              <span className="text-sm">
                {healthQuery.data?.timestamp
                  ? new Date(healthQuery.data.timestamp).toLocaleTimeString()
                  : 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Model Performance Metrics</CardTitle>
            <CardDescription>Zone: {zone_id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metric Selector */}
            <div className="flex gap-2">
              {(['mae', 'rmse', 'mape'] as const).map((metric) => (
                <Button
                  key={metric}
                  variant={selectedMetric === metric ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedMetric(metric)}
                >
                  {metric.toUpperCase()}
                </Button>
              ))}
            </div>

            {/* Selected Metric Display */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">
                {getMetricDescription(selectedMetric)}
              </div>
              <div className="text-4xl font-bold text-gray-900">
                {getMetricValue(metrics, selectedMetric)}
              </div>
            </div>

            {/* All Metrics Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">MAE</div>
                <div className="text-2xl font-semibold">{metrics.mae.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">RMSE</div>
                <div className="text-2xl font-semibold">{metrics.rmse.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">MAPE</div>
                <div className="text-2xl font-semibold">{metrics.mape.toFixed(1)}%</div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Prediction Interval Coverage</span>
                <span className="text-sm">{(metrics.pi_coverage * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Prediction Interval Width</span>
                <span className="text-sm">{metrics.pi_width.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Training Samples</span>
                <span className="text-sm">{metrics.training_samples}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Validation Date</span>
                <span className="text-sm">
                  {new Date(metrics.validation_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Training Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Model Training
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleTrain}
              disabled={isTraining || trainMutation.isPending}
              className="flex-1"
            >
              {trainMutation.isPending ? 'Starting Training...' : 'Train New Model'}
            </Button>
          </div>

          {trainingJobs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent Training Jobs</h4>
              {trainingJobs.slice(-3).map((job) => (
                <div
                  key={job.model_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{job.model_id}</div>
                    <div className="text-xs text-gray-600">
                      {job.status === 'completed' ? (
                        <span className="text-green-600">✓ Completed</span>
                      ) : job.status === 'failed' ? (
                        <span className="text-red-600">✗ Failed</span>
                      ) : (
                        <span className="text-blue-600">⟳ {job.status}</span>
                      )}
                    </div>
                  </div>
                  {job.eta_seconds && job.status === 'training' && (
                    <div className="text-xs text-gray-600">
                      ETA: {Math.ceil(job.eta_seconds / 60)}m
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div>
                <div className="text-sm font-medium">Model Accuracy</div>
                <div className="text-xs text-gray-600">Improving over time</div>
              </div>
              <TrendingDown className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <div className="text-sm font-medium">Data Volume</div>
                <div className="text-xs text-gray-600">
                  {metrics?.training_samples || 0} samples
                </div>
              </div>
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
