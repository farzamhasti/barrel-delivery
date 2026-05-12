import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const LEGEND_ITEMS = [
  {
    color: '#0000ff',
    label: 'Blue',
    intensity: '0-16.7%',
    description: 'Very low delivery density - minimal orders in this area',
  },
  {
    color: '#00bfff',
    label: 'Cyan',
    intensity: '16.7-33.3%',
    description: 'Low density - occasional delivery clusters',
  },
  {
    color: '#00ff00',
    label: 'Green',
    intensity: '33.3-50%',
    description: 'Medium density - moderate delivery activity',
  },
  {
    color: '#ffff00',
    label: 'Yellow',
    intensity: '50-66.7%',
    description: 'High density - significant delivery concentration',
  },
  {
    color: '#ff7f00',
    label: 'Orange',
    intensity: '66.7-83.3%',
    description: 'Very high density - major delivery hotspots',
  },
  {
    color: '#ff0000',
    label: 'Red',
    intensity: '83.3-100%',
    description: 'Critical density - your peak delivery zones',
  },
];

export const HeatmapLegendPanel: React.FC = () => {
  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-min">
        <div className="space-y-3">
          {LEGEND_ITEMS.map((item, index) => (
            <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-b-0 last:pb-0">
              {/* Color box */}
              <div
                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0 mt-0.5"
                style={{ backgroundColor: item.color }}
              />

              {/* Label and description */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">
                  {item.label} ({item.intensity})
                </p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
