'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { GISMap } from './GISMap';
import {
  generateKDEHeatmap,
  HeatmapData,
  DeliveryPoint,
} from '@/lib/heatmapCalculation';
import {
  applyTemporalFilters,
  TimeFilterOptions,
  TimePeriodType,
  getDateRange,
  calculateTimeStatistics,
  TIME_PRESETS,
  DAY_NAMES,
} from '@/lib/temporalFiltering';
import { filterToResidentialAreas } from '@/lib/osmResidentialFilter';

export interface DeliveryHeatmapAnalysisProps {
  orders: Array<{
    id: number;
    latitude: number;
    longitude: number;
    createdAt: Date;
  }>;
  isLoading?: boolean;
}

export const DeliveryHeatmapAnalysis: React.FC<DeliveryHeatmapAnalysisProps> = ({
  orders,
  isLoading = false,
}) => {
  const [periodType, setPeriodType] = useState<TimePeriodType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startHour, setStartHour] = useState<number | undefined>(undefined);
  const [endHour, setEndHour] = useState<number | undefined>(undefined);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [filterResidential, setFilterResidential] = useState(true);
  const [gridResolution, setGridResolution] = useState(50);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [filteredPoints, setFilteredPoints] = useState<DeliveryPoint[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Memoize delivery points to prevent unnecessary recalculations
  const deliveryPoints = useMemo(
    () =>
      orders.map((order) => ({
        id: order.id,
        latitude: order.latitude,
        longitude: order.longitude,
        timestamp: order.createdAt.getTime(),
      })),
    [orders]
  );

  // Memoize date range
  const dateRange = useMemo(
    () => getDateRange(selectedDate, periodType),
    [selectedDate, periodType]
  );

  // Memoize filter options
  const filterOptions = useMemo(
    (): TimeFilterOptions => ({
      periodType,
      startDate: dateRange.start,
      endDate: dateRange.end,
      startHour,
      endHour,
      daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
    }),
    [periodType, dateRange, startHour, endHour, selectedDays]
  );

  // Calculate heatmap when filters change
  useEffect(() => {
    if (deliveryPoints.length === 0) {
      setHeatmapData(null);
      setFilteredPoints([]);
      return;
    }

    setIsCalculating(true);

    // Apply temporal filters
    let filtered = applyTemporalFilters(deliveryPoints, filterOptions);

    // Apply residential filtering if enabled
    if (filterResidential) {
      filtered = filterToResidentialAreas(filtered);
    }

    setFilteredPoints(filtered);

    // Generate KDE heatmap
    if (filtered.length > 0) {
      const heatmap = generateKDEHeatmap(filtered, gridResolution);
      setHeatmapData(heatmap);
    } else {
      setHeatmapData(null);
    }

    setIsCalculating(false);
  }, [deliveryPoints, filterOptions, filterResidential, gridResolution]);

  // Memoize statistics calculation
  const statistics = useMemo(
    () =>
      filteredPoints.length > 0
        ? calculateTimeStatistics(filteredPoints, filterOptions)
        : null,
    [filteredPoints, filterOptions]
  );

  // Memoize event handlers with useCallback
  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(new Date(e.target.value));
  }, []);

  const handleDayToggle = useCallback((day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }, []);

  const handleTimePreset = useCallback(
    (preset: (typeof TIME_PRESETS)[keyof typeof TIME_PRESETS]) => {
      setStartHour(preset.startHour);
      setEndHour(preset.endHour);
    },
    []
  );

  const handlePeriodChange = useCallback((value: string) => {
    setPeriodType(value as TimePeriodType);
  }, []);

  const handleGridResolutionChange = useCallback((value: number[]) => {
    setGridResolution(value[0]);
  }, []);

  const handleResidentialFilterChange = useCallback(() => {
    setFilterResidential((prev) => !prev);
  }, []);

  const handleStartHourChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setStartHour(e.target.value ? parseInt(e.target.value) : undefined);
  }, []);

  const handleEndHourChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEndHour(e.target.value ? parseInt(e.target.value) : undefined);
  }, []);

  const handleMapReady = useCallback(
    (map: any) => {
      if (!heatmapData || !window.L) return;

      // Create heatmap layer data
      const heatmapLayerData = heatmapData.grid.map((cell) => [
        cell.latitude,
        cell.longitude,
        cell.intensity,
      ]);

      // Add heatmap layer if leaflet-heat is available
      if (window.L.heatLayer) {
        window.L.heatLayer(heatmapLayerData, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          gradient: {
            0.0: '#0000ff', // Blue
            0.25: '#00ff00', // Green
            0.5: '#ffff00', // Yellow
            0.75: '#ff7f00', // Orange
            1.0: '#ff0000', // Red
          },
        }).addTo(map);
      } else {
        // Fallback: Add circles for each heatmap cell
        heatmapData.grid.forEach((cell) => {
          const intensity = cell.intensity;
          const color =
            intensity > 0.75
              ? '#ff0000'
              : intensity > 0.5
                ? '#ff7f00'
                : intensity > 0.25
                  ? '#ffff00'
                  : '#00ff00';
          window.L.circleMarker([cell.latitude, cell.longitude], {
            radius: 5,
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 0.7,
            fillOpacity: 0.5,
          }).addTo(map);
        });
      }
    },
    [heatmapData]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Delivery Heatmap Analysis
          </CardTitle>
          <CardDescription>
            Visualize delivery demand intensity across residential areas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Time Period Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Analysis Period</label>
                <Select value={periodType} onValueChange={handlePeriodChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={handleDateChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Time Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Time Presets</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(TIME_PRESETS).map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTimePreset(preset)}
                  className={
                    startHour === preset.startHour && endHour === preset.endHour
                      ? 'bg-blue-100 border-blue-500'
                      : ''
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Hour Range */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Hour Range (Optional)</label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-600">Start Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={startHour ?? ''}
                  onChange={handleStartHourChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600">End Hour</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={endHour ?? ''}
                  onChange={handleEndHourChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Day of Week Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Days of Week (Optional)</label>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((day, index) => (
                <Button
                  key={index}
                  variant={selectedDays.includes(index) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDayToggle(index)}
                >
                  {day.substring(0, 3)}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid Resolution */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Grid Resolution: {gridResolution}
            </label>
            <Slider
              value={[gridResolution]}
              onValueChange={handleGridResolutionChange}
              min={10}
              max={100}
              step={10}
              className="w-full"
            />
          </div>

          {/* Residential Filter */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="residential-filter"
              checked={filterResidential}
              onChange={handleResidentialFilterChange}
              className="w-4 h-4"
            />
            <label htmlFor="residential-filter" className="text-sm font-medium">
              Filter to Residential Areas Only
            </label>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600">Delivery Points</p>
                <p className="text-lg font-semibold">{statistics.totalPoints}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Average Intensity</p>
                <p className="text-lg font-semibold">
                  {(statistics.averageIntensity * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Peak Hour</p>
                <p className="text-lg font-semibold">
                  {statistics.peakHour}:00
                </p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isCalculating && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Calculating heatmap...</span>
            </div>
          )}

          {/* Error State */}
          {filteredPoints.length === 0 && !isCalculating && (
            <div className="flex items-center gap-2 text-yellow-600 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No delivery data available for selected filters</span>
            </div>
          )}

          {/* Map Display */}
          {heatmapData && (
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
              <GISMap onMapReady={handleMapReady} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
