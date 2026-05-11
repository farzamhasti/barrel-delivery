'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { GISMap } from './GISMap';
import { trpc } from '@/lib/trpc';
import {
  generateKDEHeatmap,
  HeatmapData,
  DeliveryPoint,
  convertToLeafletHeatmapFormat,
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
  dateRange: { startDate: Date; endDate: Date };
  areaFilter: 'all' | 'Downtown' | 'Central Park' | 'Both';
}

export const DeliveryHeatmapAnalysis: React.FC<DeliveryHeatmapAnalysisProps> = ({
  dateRange,
  areaFilter,
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

  // Fetch heatmap data from server
  const { data: heatmapDataResponse, isLoading: isDataLoading } = trpc.analytics.getDeliveryHeatmapData.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    areaFilter: areaFilter,
  });

  // Convert server response to DeliveryPoint format
  const deliveryPoints = useMemo(() => {
    if (!heatmapDataResponse?.points) return [];
    return heatmapDataResponse.points.map((point) => ({
      id: point.orderId,
      latitude: point.lat,
      longitude: point.lng,
      timestamp: point.timestamp,
    }));
  }, [heatmapDataResponse?.points]);

  // Memoize date range for temporal filtering
  const temporalDateRange = useMemo(
    () => getDateRange(selectedDate, periodType),
    [selectedDate, periodType]
  );

  // Memoize filter options
  const filterOptions = useMemo(
    (): TimeFilterOptions => ({
      periodType,
      startDate: temporalDateRange.start,
      endDate: temporalDateRange.end,
      startHour,
      endHour,
      daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined,
    }),
    [periodType, temporalDateRange, startHour, endHour, selectedDays]
  );

  // Calculate heatmap when filters change
  const isCalculating = useMemo(() => {
    if (deliveryPoints.length === 0) {
      setHeatmapData(null);
      setFilteredPoints([]);
      return false;
    }

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

    return false;
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

      // Create heatmap layer data in Leaflet format
      const heatmapLayerData = convertToLeafletHeatmapFormat(heatmapData);

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
        heatmapData.gridPoints.forEach((point) => {
          const intensity = point.intensity;
          const color =
            intensity > 0.75
              ? '#ff0000'
              : intensity > 0.5
                ? '#ff7f00'
                : intensity > 0.25
                  ? '#ffff00'
                  : '#00ff00';
          window.L.circleMarker([point.lat, point.lng], {
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
                <p className="text-xs text-gray-600">Total Orders</p>
                <p className="text-lg font-semibold">{heatmapDataResponse?.totalOrders || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">With Coordinates</p>
                <p className="text-lg font-semibold">{heatmapDataResponse?.ordersWithCoordinates || 0}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {(isDataLoading || isCalculating) && (
            <div className="flex items-center gap-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading heatmap data...</span>
            </div>
          )}

          {/* Error State */}
          {!isDataLoading && filteredPoints.length === 0 && (
            <div className="flex items-center gap-2 text-yellow-600 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">No delivery data available for selected filters</span>
            </div>
          )}

          {/* Map Display */}
          {heatmapData && (
            <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
              <GISMap title="Delivery Heatmap" onMapReady={handleMapReady} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
