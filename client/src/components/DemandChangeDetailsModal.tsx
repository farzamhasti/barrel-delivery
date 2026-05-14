import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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

interface DemandChangeDetailsModalProps {
  zone: DemandZone | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DemandChangeDetailsModal({ zone, isOpen, onClose }: DemandChangeDetailsModalProps) {
  if (!zone) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={getClassificationColor(zone.classification)}>
              {zone.classification}
            </Badge>
            <span className="text-sm font-normal text-gray-600">Zone {zone.zoneId.split('_')[0]}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">Previous Period</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{zone.previousPeriodOrders}</p>
              <p className="text-xs text-blue-700 mt-1">Orders</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-green-900">Current Period</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{zone.currentPeriodOrders}</p>
              <p className="text-xs text-green-700 mt-1">Orders</p>
            </div>
          </div>

          {/* Growth Metrics */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-purple-900 mb-3">Demand Change</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-purple-700">Density Change</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {zone.orderDensityChange > 0 ? '+' : ''}{zone.orderDensityChange}
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-700">Growth Rate</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {zone.growthPercentage > 0 ? '+' : ''}{zone.growthPercentage.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-purple-700">Zone Location</p>
                <p className="text-sm font-mono text-purple-600 mt-1">
                  {zone.latitude.toFixed(3)}, {zone.longitude.toFixed(3)}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Time Analysis */}
          <div className="border rounded-lg p-4">
            <p className="text-sm font-semibold mb-3">Delivery Time Analysis</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Total Delivery Time</p>
                  <p className="text-xs text-gray-500 mt-1">From order creation to delivery</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {zone.avgDeliveryTimePrevious.toFixed(1)}m → {zone.avgDeliveryTimeCurrent.toFixed(1)}m
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-sm font-semibold ${zone.deliveryTimeTrend < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {zone.deliveryTimeTrend < 0 ? '-' : '+'}{Math.abs(zone.deliveryTimeTrend).toFixed(1)}m
                    </span>
                    {getTrendIcon(zone.deliveryTimeTrend)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Waiting Time Analysis */}
          <div className="border rounded-lg p-4">
            <p className="text-sm font-semibold mb-3">Waiting Time Analysis</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Kitchen Waiting Time</p>
                  <p className="text-xs text-gray-500 mt-1">From order creation to food ready</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {zone.avgWaitingTimePrevious.toFixed(1)}m → {zone.avgWaitingTimeCurrent.toFixed(1)}m
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className={`text-sm font-semibold ${zone.waitingTimeTrend < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {zone.waitingTimeTrend < 0 ? '-' : '+'}{Math.abs(zone.waitingTimeTrend).toFixed(1)}m
                    </span>
                    {getTrendIcon(zone.waitingTimeTrend)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interpretation */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">Zone Interpretation</p>
            <p className="text-sm text-blue-800">
              {zone.classification === 'Strong Growth' && 'This zone shows strong demand growth. Consider increasing delivery capacity and monitoring operational efficiency.'}
              {zone.classification === 'Moderate Growth' && 'This zone shows moderate demand growth. Monitor operational metrics to ensure service quality.'}
              {zone.classification === 'Stable' && 'This zone shows stable demand. Current operations appear well-matched to demand.'}
              {zone.classification === 'Weakening' && 'This zone shows weakening demand. Consider reviewing delivery strategy and customer retention.'}
              {zone.classification === 'Rapid Decline' && 'This zone shows rapid demand decline. Investigate potential issues and consider targeted marketing efforts.'}
            </p>
          </div>

          {/* Orders Count */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-semibold mb-2">Order Locations in Zone</p>
            <p className="text-sm text-gray-600">
              {zone.orderLocations.length} order{zone.orderLocations.length !== 1 ? 's' : ''} in this geographic zone
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
