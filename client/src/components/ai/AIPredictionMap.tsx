/**
 * AI Prediction Map Component
 * Interactive mini geo map with prediction overlays
 */

import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, MapPin, Zap } from 'lucide-react';

interface AIPredictionMapProps {
  predictions: any;
}

export default function AIPredictionMap({ predictions }: AIPredictionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Map initialization will happen here when integrated with actual map library
    // For now, showing placeholder with mock visualization
  }, [predictions]);

  if (!predictions) {
    return (
      <Card className="p-8 bg-gray-50 border-dashed">
        <div className="text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Loading prediction map...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <Card className="p-4 bg-white border-2 border-purple-200 h-96">
        <div
          ref={mapContainer}
          className="w-full h-full bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center relative overflow-hidden"
        >
          {/* Mock Map Visualization */}
          <div className="absolute inset-0 bg-opacity-10">
            {/* Hotspot Indicators */}
            <div className="absolute top-1/4 left-1/3 w-16 h-16 bg-red-400 rounded-full opacity-30 animate-pulse" />
            <div className="absolute top-1/2 right-1/4 w-12 h-12 bg-orange-400 rounded-full opacity-40 animate-pulse" />
            <div className="absolute bottom-1/4 left-1/2 w-10 h-10 bg-yellow-400 rounded-full opacity-35 animate-pulse" />

            {/* Center Marker */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
            </div>
          </div>

          {/* Map Legend Overlay */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs space-y-2">
            <div className="font-semibold text-gray-700 mb-2">Prediction Intensity</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <span>High Demand</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-400 rounded-full" />
              <span>Medium Demand</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full" />
              <span>Low Demand</span>
            </div>
          </div>

          {/* Info Badge */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 text-xs font-semibold text-purple-700">
            AI Predictions
          </div>
        </div>
      </Card>

      {/* Prediction Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Hotspot Details */}
        <Card className="p-3 bg-gradient-to-br from-red-50 to-orange-50 border-orange-200">
          <div className="flex items-start gap-2">
            <Zap className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-gray-700">Hotspots</h4>
              <p className="text-xs text-gray-600 mt-1">
                {predictions.hotspots.active_hotspots} active zones detected
              </p>
              <p className="text-xs text-orange-600 font-semibold mt-1">
                Coverage: {predictions.hotspots.coverage_area}
              </p>
            </div>
          </div>
        </Card>

        {/* Risk Zones */}
        <Card className="p-3 bg-gradient-to-br from-yellow-50 to-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-gray-700">Risk Zones</h4>
              <p className="text-xs text-gray-600 mt-1">
                {predictions.riskAssessment.overall_risk_level.toUpperCase()} risk level
              </p>
              <p className="text-xs text-red-600 font-semibold mt-1">
                Delay risk: {(predictions.riskAssessment.delay_probability * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </Card>

        {/* Optimization Zones */}
        <Card className="p-3 bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-gray-700">Optimization</h4>
              <p className="text-xs text-gray-600 mt-1">
                {predictions.demandForecast.predicted_demand} orders forecasted
              </p>
              <p className="text-xs text-green-600 font-semibold mt-1">
                Efficiency potential: +{(predictions.demandForecast.confidence_score * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Map Controls Info */}
      <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded-lg">
        <p>Interactive map with real-time prediction overlays - Zoom, pan, and click for details</p>
      </div>
    </div>
  );
}
