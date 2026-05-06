import { Badge } from "@/components/ui/badge";
import { Truck } from "lucide-react";

interface DriverStat {
  name: string;
  deliveryCount: number;
  status: string;
}

interface DriverStatsTableProps {
  drivers: DriverStat[];
  isLoading: boolean;
}

export function DriverStatsTable({ drivers, isLoading }: DriverStatsTableProps) {
  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-500">
        Loading driver statistics...
      </div>
    );
  }

  if (!drivers || drivers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No driver data available
      </div>
    );
  }

  // Sort drivers by delivery count (descending)
  const sortedDrivers = [...drivers].sort((a, b) => b.deliveryCount - a.deliveryCount);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700">Driver Name</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">Deliveries</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedDrivers.map((driver, index) => (
            <tr key={index} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                {driver.name}
              </td>
              <td className="px-4 py-3 text-center">
                <Badge 
                  className={driver.status === 'online' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                  }
                >
                  {driver.status === 'online' ? 'Online' : 'Offline'}
                </Badge>
              </td>
              <td className="px-4 py-3 text-center font-semibold text-gray-900">
                {driver.deliveryCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
