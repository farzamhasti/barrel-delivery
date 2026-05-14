import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

export function DemandChangeAnalysisCard() {
  const [selectedZone, setSelectedZone] = useState<DemandZone | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Default to last 7 days vs previous 7 days
  const today = new Date();
  const currentStartDate = new Date(today);
  currentStartDate.setDate(currentStartDate.getDate() - 7);
  const currentEndDate = new Date(today);

  const previousStartDate = new Date(currentStartDate);
  previousStartDate.setDate(previousStartDate.getDate() - 7);
  const previousEndDate = new Date(currentStartDate);

  // Memoize dates to prevent query refetch on every render
  const dateParams = useMemo(() => ({
    previousStartDate,
    previousEndDate,
    currentStartDate,
    currentEndDate,
  }), []);

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

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Demand Change Analysis
          </CardTitle>
          <CardDescription>
            Geographic demand evolution within Fort Erie over time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">Previous Period</p>
              <p className="text-2xl font-bold text-blue-600">
                {analysisData?.periodComparison.previousPeriod.totalOrders || 0}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {analysisData?.periodComparison.previousPeriod.startDate?.toLocaleDateString()} -{' '}
                {analysisData?.periodComparison.previousPeriod.endDate?.toLocaleDateString()}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-green-900">Current Period</p>
              <p className="text-2xl font-bold text-green-600">
                {analysisData?.periodComparison.currentPeriod.totalOrders || 0}
              </p>
              <p className="text-xs text-green-700 mt-1">
                {analysisData?.periodComparison.currentPeriod.startDate?.toLocaleDateString()} -{' '}
                {analysisData?.periodComparison.currentPeriod.endDate?.toLocaleDateString()}
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
