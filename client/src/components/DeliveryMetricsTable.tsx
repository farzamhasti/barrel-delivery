import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface DeliveryMetric {
  id: number;
  orderNumber: string;
  driverName: string | null;
  waitTime: number;
  readyTime: number;
  enRouteTime: number;
  deliveryTime: string;
}

interface DeliveryMetricsTableProps {
  metrics: DeliveryMetric[];
  isLoading: boolean;
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function DeliveryMetricsTable({ metrics, isLoading }: DeliveryMetricsTableProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading delivery metrics...
      </div>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No delivery data available for selected period
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Order #</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Wait Time</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Ready Time</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">En Route Time</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Delivery Time (Ontario)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {metrics.map((metric) => (
            <tr key={metric.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{metric.orderNumber}</td>
              <td className="px-4 py-3 text-gray-700">{metric.driverName || 'Unassigned'}</td>
              <td className="px-4 py-3 text-center text-gray-600">{formatSeconds(metric.waitTime)}</td>
              <td className="px-4 py-3 text-center text-gray-600">{formatSeconds(metric.readyTime)}</td>
              <td className="px-4 py-3 text-center text-gray-600">{formatSeconds(metric.enRouteTime)}</td>
              <td className="px-4 py-3 text-gray-700">{metric.deliveryTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
