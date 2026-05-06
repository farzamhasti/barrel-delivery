import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Truck, CheckCircle2, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DeliveryMetricsTable } from "@/components/DeliveryMetricsTable";
import { DriverStatsTable } from "@/components/DriverStatsTable";
import { AdvancedDateRangeSelector, type DateRange } from "@/components/AdvancedDateRangeSelector";

export function DeliveryReportTab() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date(),
    preset: "last7days",
    reportType: "daily",
  });

  // Fetch delivery report data
  const { data: reportData, isLoading } = trpc.orders.getDeliveryReport.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  // Calculate metrics from report data
  const metrics = useMemo(() => {
    if (!reportData) {
      return {
        totalDelivered: 0,
        averageWaitTime: 0,
        averageReadyTime: 0,
        averageEnRouteTime: 0,
      };
    }

    const orders = reportData.orders || [];
    if (orders.length === 0) {
      return {
        totalDelivered: 0,
        averageWaitTime: 0,
        averageReadyTime: 0,
        averageEnRouteTime: 0,
      };
    }

    const totalWaitTime = orders.reduce((sum, o) => sum + (o.waitTime || 0), 0);
    const totalReadyTime = orders.reduce((sum, o) => sum + (o.readyTime || 0), 0);
    const totalEnRouteTime = orders.reduce((sum, o) => sum + (o.enRouteTime || 0), 0);

    return {
      totalDelivered: orders.length,
      averageWaitTime: Math.round(totalWaitTime / orders.length),
      averageReadyTime: Math.round(totalReadyTime / orders.length),
      averageEnRouteTime: Math.round(totalEnRouteTime / orders.length),
    };
  }, [reportData]);

  const formatSeconds = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Advanced Date Range Selector */}
      <AdvancedDateRangeSelector 
        onDateRangeChange={handleDateRangeChange}
        defaultPreset={dateRange.preset as any}
        defaultReportType={dateRange.reportType}
      />

      {/* Metrics Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Total Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{metrics.totalDelivered}</div>
              <p className="text-xs text-green-700 mt-1">orders completed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Avg. Wait Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatSeconds(metrics.averageWaitTime)}</div>
              <p className="text-xs text-blue-700 mt-1">order to ready</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">Avg. Ready Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatSeconds(metrics.averageReadyTime)}</div>
              <p className="text-xs text-purple-700 mt-1">ready to driver</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Avg. En Route</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatSeconds(metrics.averageEnRouteTime)}</div>
              <p className="text-xs text-orange-700 mt-1">driver to delivery</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delivery Times Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Delivery Times Breakdown
          </CardTitle>
          <CardDescription>Detailed breakdown of each order's delivery timeline</CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryMetricsTable 
            metrics={reportData?.orders || []} 
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Driver Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Driver Delivery Statistics
          </CardTitle>
          <CardDescription>Number of deliveries completed by each driver (online and offline)</CardDescription>
        </CardHeader>
        <CardContent>
          <DriverStatsTable 
            drivers={reportData?.drivers || []} 
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
