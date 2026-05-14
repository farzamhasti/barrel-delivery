import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface RelativeDemandRegion {
  id: string;
  centerLat: number;
  centerLon: number;
  orderCount: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
  relativeDemandScore: number;
  relativeDeliveryPerformance: number;
  relativeWaitingTime: number;
  relativeOperationalIntensity: number;
  classification: 'very_high' | 'high' | 'average' | 'weak' | 'underperforming';
  color: string;
}

interface CityWideStats {
  totalOrders: number;
  avgOrderDensity: number;
  avgDeliveryTime: number;
  avgWaitingTime: number;
  avgOperationalIntensity: number;
}

export interface RelativeDemandAnalysisCardProps {
  isCompact?: boolean;
  onOpenExpanded?: () => void;
}

export const RelativeDemandAnalysisCard: React.FC<RelativeDemandAnalysisCardProps> = ({
  isCompact = false,
  onOpenExpanded,
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [regions, setRegions] = useState<RelativeDemandRegion[]>([]);
  const [cityStats, setCityStats] = useState<CityWideStats | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RelativeDemandRegion | null>(null);

  const startDate = startOfMonth(selectedMonth);
  const endDate = endOfMonth(selectedMonth);

  const { data, isLoading, error } = trpc.analytics.analyzeRelativeDemand.useQuery(
    {
      startDate,
      endDate,
    },
    {
      enabled: isExpanded,
    }
  );

  useEffect(() => {
    if (data?.success && data.regions) {
      setRegions(data.regions);
      setCityStats(data.cityWideStats);
      setInterpretation(data.interpretation);
    }
  }, [data]);

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  const getClassificationLabel = (classification: string) => {
    const labels: Record<string, string> = {
      very_high: 'Very High Demand',
      high: 'High Demand',
      average: 'Average',
      weak: 'Weak Demand',
      underperforming: 'Underperforming',
    };
    return labels[classification] || classification;
  };

  const getClassificationColor = (classification: string) => {
    const colors: Record<string, string> = {
      very_high: 'bg-blue-900 text-white',
      high: 'bg-blue-500 text-white',
      average: 'bg-yellow-400 text-black',
      weak: 'bg-orange-500 text-white',
      underperforming: 'bg-red-500 text-white',
    };
    return colors[classification] || 'bg-gray-200';
  };

  if (!isExpanded && isCompact) {
    return (
      <Card 
        className="cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => {
          setIsExpanded(true);
          onOpenExpanded?.();
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">Relative Demand Analysis</CardTitle>
              <CardDescription>Geographic demand evolution over time</CardDescription>
            </div>
            <MapPin className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            Click to view detailed demand analysis
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Compare monthly demand trends and zone performance
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isExpanded) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>Relative Demand Analysis</CardTitle>
            <CardDescription>Geographic demand relative to Fort Erie-wide averages</CardDescription>
          </div>
          {isCompact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
            >
              ← Back to Grid View
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <div className="text-center">
            <div className="text-lg font-semibold">
              {format(selectedMonth, 'MMMM yyyy')}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            disabled={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1) > new Date()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Analyzing demand patterns...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">
              Error loading analysis: {error.message}
            </p>
          </div>
        )}

        {/* City-Wide Statistics */}
        {cityStats && !isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Orders</div>
              <div className="text-2xl font-bold text-blue-900">{cityStats.totalOrders}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Avg Delivery Time</div>
              <div className="text-2xl font-bold text-green-900">
                {Math.round(cityStats.avgDeliveryTime)} min
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Avg Waiting Time</div>
              <div className="text-2xl font-bold text-orange-900">
                {Math.round(cityStats.avgWaitingTime)} min
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Order Density</div>
              <div className="text-2xl font-bold text-purple-900">
                {cityStats.avgOrderDensity.toFixed(1)}/km²
              </div>
            </div>
          </div>
        )}

        {/* Regions List */}
        {regions.length > 0 && !isLoading && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Demand Zones ({regions.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regions.map(region => (
                <div
                  key={region.id}
                  className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedRegion(region)}
                  style={{
                    borderLeftColor: region.color,
                    borderLeftWidth: '4px',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">
                        {region.id.replace('region_', 'Zone ')}
                      </div>
                      <Badge className={getClassificationColor(region.classification)}>
                        {getClassificationLabel(region.classification)}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{region.orderCount}</div>
                      <div className="text-xs text-muted-foreground">orders</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Demand Score</div>
                      <div className="font-semibold">{region.relativeDemandScore.toFixed(0)}/100</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Delivery Perf</div>
                      <div className="font-semibold">{region.relativeDeliveryPerformance.toFixed(0)}/100</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Delivery</div>
                      <div className="font-semibold">{Math.round(region.avgDeliveryTime)} min</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Avg Waiting</div>
                      <div className="font-semibold">{Math.round(region.avgWaitingTime)} min</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Interpretation */}
        {interpretation && !isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-2 text-blue-900">Spatial Insight</h3>
            <p className="text-sm text-blue-800">{interpretation}</p>
          </div>
        )}

        {/* Selected Region Details */}
        {selectedRegion && (
          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                {selectedRegion.id.replace('region_', 'Zone ')} Details
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRegion(null)}
              >
                ✕
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Local Order Density</div>
                <div className="text-lg font-bold">{(selectedRegion.orderCount / 32).toFixed(2)}/km²</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">City-wide Avg</div>
                <div className="text-lg font-bold">{cityStats?.avgOrderDensity.toFixed(2)}/km²</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Local Avg Delivery Time</div>
                <div className="text-lg font-bold">{Math.round(selectedRegion.avgDeliveryTime)} min</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">City-wide Avg</div>
                <div className="text-lg font-bold">{Math.round(cityStats?.avgDeliveryTime || 0)} min</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Relative Demand Score</div>
                <div className="text-lg font-bold">{selectedRegion.relativeDemandScore.toFixed(0)}/100</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Operational Intensity</div>
                <div className="text-lg font-bold">{selectedRegion.relativeOperationalIntensity.toFixed(0)}/100</div>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {regions.length === 0 && !isLoading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No delivery data available for {format(selectedMonth, 'MMMM yyyy')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
