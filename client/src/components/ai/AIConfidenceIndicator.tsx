/**
 * AI Confidence Indicator Component
 * Visual indicator for prediction confidence scores
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AIConfidenceIndicatorProps {
  score: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
}

export default function AIConfidenceIndicator({
  score,
  size = 'md',
  showLabel = true,
  showPercentage = true
}: AIConfidenceIndicatorProps) {
  const percentage = Math.round(score * 100);

  // Determine color based on confidence level
  const getColor = () => {
    if (score >= 0.85) return 'text-green-600 bg-green-100';
    if (score >= 0.70) return 'text-blue-600 bg-blue-100';
    if (score >= 0.50) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLabel = () => {
    if (score >= 0.85) return 'Very High';
    if (score >= 0.70) return 'High';
    if (score >= 0.50) return 'Medium';
    return 'Low';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-6 h-6 text-xs';
      case 'lg':
        return 'w-10 h-10 text-base';
      case 'md':
      default:
        return 'w-8 h-8 text-sm';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Circular Indicator */}
      <div
        className={`${getSizeClasses()} rounded-full ${getColor()} flex items-center justify-center font-bold border-2 border-current border-opacity-30 flex-shrink-0`}
      >
        {percentage}%
      </div>

      {/* Label and Details */}
      {(showLabel || showPercentage) && (
        <div className="flex flex-col gap-0.5">
          {showLabel && (
            <span className="text-xs font-semibold text-gray-700">
              {getLabel()} Confidence
            </span>
          )}
          {showPercentage && (
            <span className={`text-xs font-semibold ${getColor()}`}>
              {percentage}% certain
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Confidence Meter Component
 * Horizontal bar visualization of confidence
 */
export function ConfidenceMeter({ score, label }: { score: number; label?: string }) {
  const getBarColor = () => {
    if (score >= 0.85) return 'bg-green-500';
    if (score >= 0.70) return 'bg-blue-500';
    if (score >= 0.50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gray-700">{label}</span>
          <span className="font-bold text-gray-600">
            {Math.round(score * 100)}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${getBarColor()} h-2 rounded-full transition-all`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Confidence Badge Component
 * Badge-style confidence indicator
 */
export function ConfidenceBadge({ score }: { score: number }) {
  const getVariant = () => {
    if (score >= 0.85) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 0.70) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (score >= 0.50) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const getLabel = () => {
    if (score >= 0.85) return '✓ Very High';
    if (score >= 0.70) return '✓ High';
    if (score >= 0.50) return '~ Medium';
    return '✗ Low';
  };

  return (
    <Badge className={`text-xs border ${getVariant()}`}>
      {getLabel()} ({Math.round(score * 100)}%)
    </Badge>
  );
}
