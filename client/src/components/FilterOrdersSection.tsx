import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";

interface FilteredOrder {
  id: number;
  orderNumber: string;
  driverName: string | null;
  waitTime: number;
  readyTime: number;
  enRouteTime: number;
  totalTime: number;
  deliveryTime: string;
}

interface FilterOrdersSectionProps {
  orders: FilteredOrder[];
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function parseTimeInput(input: string): number {
  // Parse input like "5m 30s" or "5m" or "30s" to seconds
  let totalSeconds = 0;
  const minuteMatch = input.match(/(\d+)\s*m/);
  const secondMatch = input.match(/(\d+)\s*s/);
  
  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1]) * 60;
  }
  if (secondMatch) {
    totalSeconds += parseInt(secondMatch[1]);
  }
  
  return totalSeconds;
}

export function FilterOrdersSection({ orders }: FilterOrdersSectionProps) {
  const [thresholdInput, setThresholdInput] = useState<string>('');
  const [filteredOrders, setFilteredOrders] = useState<FilteredOrder[]>([]);
  const [hasFiltered, setHasFiltered] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFilter = () => {
    setError('');
    
    if (!thresholdInput.trim()) {
      setError('Please enter a time threshold');
      return;
    }

    const thresholdSeconds = parseTimeInput(thresholdInput);
    
    if (thresholdSeconds <= 0) {
      setError('Please enter a valid time (e.g., "5m", "30s", or "5m 30s")');
      return;
    }

    const filtered = orders.filter(order => order.totalTime > thresholdSeconds);
    setFilteredOrders(filtered);
    setHasFiltered(true);
  };

  const handleReset = () => {
    setThresholdInput('');
    setFilteredOrders([]);
    setHasFiltered(false);
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFilter();
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <div>
            <CardTitle>Filter Orders</CardTitle>
            <CardDescription>
              Find orders with total delivery time greater than specified threshold
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Input Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Time Threshold
            </label>
            <input
              type="text"
              placeholder="e.g., 5m, 30s, or 5m 30s"
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            {error && (
              <p className="text-red-600 text-sm mt-1">{error}</p>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleFilter}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {hasFiltered && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Found <span className="font-semibold text-gray-900">{filteredOrders.length}</span> order{filteredOrders.length !== 1 ? 's' : ''} with total time greater than <span className="font-semibold">{thresholdInput}</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No orders found with total time greater than {thresholdInput}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Order #</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Pending Time</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Ready Time</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">On the Way Time</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-700">Total Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Delivered Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{order.orderNumber}</td>
                        <td className="px-4 py-3 text-gray-700">{order.driverName || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{formatSeconds(order.waitTime)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{formatSeconds(order.readyTime)}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{formatSeconds(order.enRouteTime)}</td>
                        <td className="px-4 py-3 text-center text-gray-600 font-medium text-blue-600">{formatSeconds(order.totalTime)}</td>
                        <td className="px-4 py-3 text-gray-700">{order.deliveryTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
