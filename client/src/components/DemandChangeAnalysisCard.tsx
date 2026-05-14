import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Minus, Calendar, ChevronDown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { DemandChangeMap } from './DemandChangeMap';
import { DemandChangeDetailsModal } from './DemandChangeDetailsModal';

interface DemandZone {
  zoneId: string;
  latitude: number;
  longitude: number;
  previousPeriodOrders: number;
  currentPeriodOrders: number;
  orderDensityChange: number;
  growthPercentage: number;
  classification: 'Strong Growth' | 'Moderate Growth' | 'Stable' | 'Weakening' | 'Rapid Decline';
  avgWaitingTimePrevious: number;
  avgWaitingTimeCurrent: number;
  waitingTimeTrend: number;
  avgDeliveryTimePrevious: number;
  avgDeliveryTimeCurrent: number;
  deliveryTimeTrend: number;
  orderLocations: Array<{ lat: number; lon: number; orderId: string }>;
}

type ComparisonMode = 'previous-month' | 'previous-year';

interface DemandChangeAnalysisCardProps {
  isCompact?: boolean;
  onOpenExpanded?: () => void;
}

export function DemandChangeAnalysisCard({ isCompact = false, onOpenExpanded }: DemandChangeAnalysisCardProps) {
  const [selectedZone, setSelectedZone] = useState<DemandZone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Month/Year selection
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('previous-month');

  // Calculate date ranges based on selection
  const dateParams = useMemo(() => {
    // Get the first and last day of the selected month
    const currentStartDate = new Date(selectedYear, selectedMonth, 1);
    const currentEndDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    let previousStartDate: Date;
    let previousEndDate: Date;

    if (comparisonMode === 'previous-month') {
      // Compare with previous month
      previousStartDate = new Date(selectedYear, selectedMonth - 1, 1);
      previousEndDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
    } else {
      // Compare with same month previous year
      previousStartDate = new Date(selectedYear - 1, selectedMonth, 1);
      previousEndDate = new Date(selectedYear - 1, selectedMonth + 1, 0, 23, 59, 59, 999);
    }

    return {
      previousStartDate,
      previousEndDate,
      currentStartDate,
      currentEndDate,
    };
  }, [selectedMonth, selectedYear, comparisonMode]);

  const { data: analysisData, isLoading } = trpc.analytics.analyzeDemandChange.useQuery(dateParams);

  const zones = analysisData?.zones || [];
  const interpretation = analysisData?.spatialInterpretation || '';

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'Strong Growth':
        return 'bg-green-600 text-white';
      case 'Moderate Growth':
        return 'bg-green-400 text-white';
      case 'Stable':
        return 'bg-yellow-500 text-white';
      case 'Weakening':
        return 'bg-orange-500 text-white';
      case 'Rapid Decline':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const handleZoneClick = (zone: DemandZone) => {
    setSelectedZone(zone);
    setIsModalOpen(true);
  };

  // Format month/year display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthLabel = `${monthNames[selectedMonth]} ${selectedYear}`;
  
  let comparisonMonthLabel: string;
  if (comparisonMode === 'previous-month') {
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    comparisonMonthLabel = `${monthNames[prevMonth]} ${prevYear}`;
  } else {
    comparisonMonthLabel = `${monthNames[selectedMonth]} ${selectedYear - 1}`;
  }

  // Get available months (don't allow future months)
  const maxMonth = today.getMonth();
  const maxYear = today.getFullYear();
  const isCurrentMonth = selectedMonth === maxMonth && selectedYear === maxYear;

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (!isCurrentMonth) {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Compact view - for grid layout
  if (isCompact) {
    const totalOrders = (analysisData?.periodComparison.currentPeriod.totalOrders || 0);
    const previousOrders = (analysisData?.periodComparison.previousPeriod.totalOrders || 0);
    const growth = previousOrders > 0 ? ((totalOrders - previousOrders) / previousOrders) * 100 : (totalOrders > 0 ? 100 : 0);

    return (
      <>
        <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={onOpenExpanded}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              Demand Change Analysis
            </CardTitle>
            <CardDescription>Geographic demand evolution over time</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Month Display */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-sm">{currentMonthLabel}</span>
              </div>
              <span className="text-xs text-gray-600">
                {comparisonMode === 'previous-month' ? 'vs Prev Month' : 'vs Last Year'}
              </span>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-blue-700 font-medium">Comparison</p>
                <p className="text-lg font-bold text-blue-600">{previousOrders}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-green-700 font-medium">Current</p>
                <p className="text-lg font-bold text-green-600">{totalOrders}</p>
              </div>
            </div>

            {/* Growth Indicator */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">Growth</span>
                <span className={`text-sm font-bold ${growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Zones Summary */}
            {isLoading ? (
              <p className="text-xs text-gray-500 text-center py-2">Loading...</p>
            ) : zones.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">{zones.length} zones detected</p>
                <div className="flex flex-wrap gap-1">
                  {zones.slice(0, 3).map((zone) => (
                    <Badge key={zone.zoneId} className={`text-xs ${getClassificationColor(zone.classification)}`}>
                      {zone.classification}
                    </Badge>
                  ))}
                  {zones.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{zones.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-2">No demand changes detected</p>
            )}

            {/* Click to expand hint */}
            <div className="flex items-center justify-center gap-1 mt-4 pt-3 border-t border-gray-200 text-gray-500">
              <span className="text-xs">Click to expand</span>
              <ChevronDown className="w-3 h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Details Modal */}
        {selectedZone && (
          <DemandChangeDetailsModal
            zone={selectedZone}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedZone(null);
            }}
          />
        )}
      </>
    );
  }

  // Full view - expanded
  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Demand Change Analysis
          </CardTitle>
          <CardDescription>
            Geographic demand evolution over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Month/Year Picker and Comparison Mode */}
          <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
            {/* Month Navigation */}
            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handlePreviousMonth}
              >
                ← Previous
              </Button>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="font-semibold text-lg">{currentMonthLabel}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNextMonth}
                disabled={isCurrentMonth}
              >
                Next →
              </Button>
            </div>

            {/* Comparison Mode Toggle */}
            <div className="flex gap-2 justify-center">
              <Button
                variant={comparisonMode === 'previous-month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComparisonMode('previous-month')}
                className="text-xs"
              >
                vs Previous Month
              </Button>
              <Button
                variant={comparisonMode === 'previous-year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setComparisonMode('previous-year')}
                className="text-xs"
              >
                vs Same Month Last Year
              </Button>
            </div>

            {/* Comparison Label */}
            <div className="text-center text-sm text-gray-600">
              Comparing <span className="font-semibold">{currentMonthLabel}</span> with <span className="font-semibold">{comparisonMonthLabel}</span>
            </div>
          </div>

          {/* Period Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">Comparison Period</p>
              <p className="text-2xl font-bold text-blue-600">
                {analysisData?.periodComparison.previousPeriod.totalOrders || 0}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {comparisonMonthLabel}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-green-900">Current Period</p>
              <p className="text-2xl font-bold text-green-600">
                {analysisData?.periodComparison.currentPeriod.totalOrders || 0}
              </p>
              <p className="text-xs text-green-700 mt-1">
                {currentMonthLabel}
              </p>
            </div>
          </div>

          {/* Map Visualization */}
          {zones.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <DemandChangeMap zones={zones} onZoneClick={handleZoneClick} />
            </div>
          )}

          {/* Spatial Interpretation */}
          {interpretation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Spatial Insight</p>
                <p className="text-sm text-blue-800 mt-1">{interpretation}</p>
              </div>
            </div>
          )}

          {/* Zones List */}
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading demand analysis...</p>
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No demand changes detected for this period</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {zones.map((zone) => (
                <div
                  key={zone.zoneId}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleZoneClick(zone)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getClassificationColor(zone.classification)}>
                          {zone.classification}
                        </Badge>
                        <span className="text-xs text-gray-500">Zone {zone.zoneId.split('_')[0]}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Orders</p>
                          <p className="font-semibold">
                            {zone.previousPeriodOrders} → {zone.currentPeriodOrders}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Growth</p>
                          <p className="font-semibold text-green-600">
                            {zone.growthPercentage > 0 ? '+' : ''}{zone.growthPercentage.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Delivery Time</p>
                          <p className="font-semibold flex items-center gap-1">
                            {zone.avgDeliveryTimePrevious.toFixed(0)} → {zone.avgDeliveryTimeCurrent.toFixed(0)} min
                            {getTrendIcon(zone.deliveryTimeTrend)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Waiting Time</p>
                          <p className="font-semibold flex items-center gap-1">
                            {zone.avgWaitingTimePrevious.toFixed(0)} → {zone.avgWaitingTimeCurrent.toFixed(0)} min
                            {getTrendIcon(zone.waitingTimeTrend)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoneClick(zone);
                      }}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {selectedZone && (
        <DemandChangeDetailsModal
          zone={selectedZone}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedZone(null);
          }}
        />
      )}
    </>
  );
}
