/**
 * AI Alerts Panel Component
 * Displays realtime AI-generated alerts
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Alert {
  id: number;
  type: 'warning' | 'caution' | 'info';
  title: string;
  message: string;
  confidence: number;
  timestamp: Date;
}

interface AIAlertsPanelProps {
  alerts: Alert[];
}

export default function AIAlertsPanel({ alerts }: AIAlertsPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'caution':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-red-50 border-red-200';
      case 'caution':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return 'bg-green-100 text-green-800';
    if (confidence >= 0.70) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const dismissAlert = (id: number) => {
    setDismissedAlerts([...dismissedAlerts, id]);
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  return (
    <div className="space-y-3">
      {/* Alert Summary */}
      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
        <div>
          <h4 className="font-semibold text-gray-700">Active AI Alerts</h4>
          <p className="text-xs text-gray-600">
            {visibleAlerts.length} alert{visibleAlerts.length !== 1 ? 's' : ''} requiring attention
          </p>
        </div>
        <Badge className="bg-purple-600 hover:bg-purple-700">
          {visibleAlerts.length}
        </Badge>
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {visibleAlerts.length > 0 ? (
          visibleAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`p-4 border-2 ${getAlertColor(alert.type)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex-shrink-0 mt-1">
                  {getAlertIcon(alert.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="font-semibold text-gray-900 text-sm">
                        {alert.title}
                      </h5>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>

                    {/* Dismiss Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-opacity-30">
                    <span className="text-xs text-gray-500">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                    <Badge className={`text-xs ${getConfidenceColor(alert.confidence)}`}>
                      {(alert.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 bg-green-50 border-2 border-green-200 text-center">
            <div className="text-green-600 mb-2">✓</div>
            <h4 className="font-semibold text-green-900">All Clear</h4>
            <p className="text-xs text-green-700 mt-1">
              No active alerts. System operating normally.
            </p>
          </Card>
        )}
      </div>

      {/* Dismissed Alerts Info */}
      {dismissedAlerts.length > 0 && (
        <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded-lg">
          <button
            onClick={() => setDismissedAlerts([])}
            className="text-purple-600 hover:text-purple-700 font-semibold"
          >
            Show {dismissedAlerts.length} dismissed alert{dismissedAlerts.length !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Alert Settings */}
      <div className="flex items-center justify-between text-xs text-gray-600 p-2 bg-gray-50 rounded-lg">
        <span>Real-time alerts enabled</span>
        <button className="text-purple-600 hover:text-purple-700 font-semibold">
          Configure
        </button>
      </div>
    </div>
  );
}
