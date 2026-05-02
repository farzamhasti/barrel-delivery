import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Timeline {
  orderId: number;
  driverId?: number;
  driverName?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export function DriverPerformanceTable({ timelines, isLoading }: { timelines: Timeline[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="text-center py-8">Loading driver data...</div>;
  }

  if (!timelines || timelines.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No driver data available</div>;
  }

  const driverStats = useMemo(() => {
    const drivers: { [key: string]: { name: string; deliveries: number; totalTime: number; completedDeliveries: number } } = {};

    timelines.forEach((timeline) => {
      const driverName = timeline.driverName || "Unknown Driver";
      if (!drivers[driverName]) {
        drivers[driverName] = { name: driverName, deliveries: 0, totalTime: 0, completedDeliveries: 0 };
      }

      drivers[driverName].deliveries += 1;

      if (timeline.pickedUpAt && timeline.deliveredAt) {
        const pickupTime = new Date(timeline.pickedUpAt).getTime();
        const deliveryTime = new Date(timeline.deliveredAt).getTime();
        const duration = Math.round((deliveryTime - pickupTime) / 60000); // Convert to minutes
        drivers[driverName].totalTime += duration;
        drivers[driverName].completedDeliveries += 1;
      }
    });

    return Object.values(drivers)
      .map((driver) => ({
        ...driver,
        averageTime: driver.completedDeliveries > 0 ? Math.round(driver.totalTime / driver.completedDeliveries) : 0,
        completionRate: Math.round((driver.completedDeliveries / driver.deliveries) * 100),
      }))
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [timelines]);

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 95) return <Badge className="bg-green-500">Excellent</Badge>;
    if (rate >= 85) return <Badge className="bg-blue-500">Good</Badge>;
    if (rate >= 70) return <Badge className="bg-yellow-500">Fair</Badge>;
    return <Badge className="bg-red-500">Needs Improvement</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Driver Name</TableHead>
              <TableHead className="text-right">Total Deliveries</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Avg. Time (min)</TableHead>
              <TableHead className="text-right">Completion Rate</TableHead>
              <TableHead className="text-center">Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {driverStats.map((driver, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{driver.name}</TableCell>
                <TableCell className="text-right">{driver.deliveries}</TableCell>
                <TableCell className="text-right">{driver.completedDeliveries}</TableCell>
                <TableCell className="text-right">{driver.averageTime}</TableCell>
                <TableCell className="text-right font-semibold text-blue-600">{driver.completionRate}%</TableCell>
                <TableCell className="text-center">{getPerformanceBadge(driver.completionRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {driverStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-muted-foreground mb-1">Top Performer</p>
            <p className="text-lg font-bold text-green-600">{driverStats[0].name}</p>
            <p className="text-xs text-muted-foreground mt-1">{driverStats[0].completionRate}% completion rate</p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-muted-foreground mb-1">Average Delivery Time</p>
            <p className="text-lg font-bold text-blue-600">
              {Math.round(driverStats.reduce((sum, d) => sum + d.averageTime, 0) / driverStats.length)} min
            </p>
            <p className="text-xs text-muted-foreground mt-1">Across all drivers</p>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-sm text-muted-foreground mb-1">Total Drivers</p>
            <p className="text-lg font-bold text-orange-600">{driverStats.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Active in this period</p>
          </div>
        </div>
      )}
    </div>
  );
}
