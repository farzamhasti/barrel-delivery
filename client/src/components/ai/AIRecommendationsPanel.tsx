/**
 * AI Recommendations Panel Component
 * Displays operational recommendations from AI analysis
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, CheckCircle, ChevronRight, TrendingUp } from 'lucide-react';

interface Recommendation {
  id: number;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number;
}

interface AIRecommendationsPanelProps {
  recommendations: Recommendation[];
}

export default function AIRecommendationsPanel({ recommendations }: AIRecommendationsPanelProps) {
  const [implementedRecommendations, setImplementedRecommendations] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴 High Priority';
      case 'medium':
        return '🟡 Medium Priority';
      case 'low':
        return '🟢 Low Priority';
      default:
        return priority;
    }
  };

  const toggleImplemented = (id: number) => {
    if (implementedRecommendations.includes(id)) {
      setImplementedRecommendations(implementedRecommendations.filter(rid => rid !== id));
    } else {
      setImplementedRecommendations([...implementedRecommendations, id]);
    }
  };

  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority as keyof typeof priorityOrder] - 
           priorityOrder[b.priority as keyof typeof priorityOrder];
  });

  const implementedCount = implementedRecommendations.length;
  const totalCount = recommendations.length;
  const implementationRate = totalCount > 0 ? (implementedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Implementation Progress */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-700">Implementation Progress</h4>
            <Badge className="bg-purple-600 hover:bg-purple-700">
              {implementedCount}/{totalCount}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
              style={{ width: `${implementationRate}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{implementationRate.toFixed(0)}% complete</span>
            <span>{totalCount - implementedCount} pending</span>
          </div>
        </div>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedRecommendations.length > 0 ? (
          sortedRecommendations.map((rec) => {
            const isImplemented = implementedRecommendations.includes(rec.id);
            const isExpanded = expandedId === rec.id;

            return (
              <Card
                key={rec.id}
                className={`p-4 border-2 transition-all ${
                  isImplemented
                    ? 'bg-green-50 border-green-200 opacity-75'
                    : 'bg-white border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleImplemented(rec.id)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 transition-all ${
                          isImplemented
                            ? 'bg-green-500 border-green-600'
                            : 'border-gray-300 hover:border-purple-500'
                        }`}
                      >
                        {isImplemented && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1">
                          <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <h5 className={`font-semibold text-sm ${
                            isImplemented ? 'text-gray-600 line-through' : 'text-gray-900'
                          }`}>
                            {rec.title}
                          </h5>
                        </div>
                        <Badge className={`text-xs ${getPriorityColor(rec.priority)}`}>
                          {getPriorityLabel(rec.priority)}
                        </Badge>
                      </div>
                    </div>

                    {/* Expand Button */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-all"
                    >
                      <ChevronRight
                        className={`w-5 h-5 text-gray-600 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="pl-9 space-y-3 border-t pt-3">
                      {/* Description */}
                      <div>
                        <h6 className="text-xs font-semibold text-gray-600 mb-1">Description</h6>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {rec.description}
                        </p>
                      </div>

                      {/* Impact */}
                      <div>
                        <h6 className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Expected Impact
                        </h6>
                        <p className="text-sm text-green-700 font-semibold">
                          {rec.impact}
                        </p>
                      </div>

                      {/* Confidence */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h6 className="text-xs font-semibold text-gray-600">Confidence</h6>
                          <span className="text-xs font-semibold text-purple-600">
                            {(rec.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                            style={{ width: `${rec.confidence * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => {
                            // Implement action
                            toggleImplemented(rec.id);
                          }}
                        >
                          Implement
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setExpandedId(null)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-8 bg-blue-50 border-2 border-blue-200 text-center">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-blue-600 opacity-50" />
            <h4 className="font-semibold text-blue-900">No Recommendations</h4>
            <p className="text-xs text-blue-700 mt-1">
              All systems operating optimally. Check back later for new insights.
            </p>
          </Card>
        )}
      </div>

      {/* Summary Footer */}
      <div className="text-xs text-gray-600 text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p>
          {implementedCount > 0
            ? `✓ ${implementedCount} recommendation${implementedCount !== 1 ? 's' : ''} implemented`
            : 'No recommendations implemented yet'}
        </p>
      </div>
    </div>
  );
}
