import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Truck, CheckCircle2, Download, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { OrderTimelineTable } from "@/components/OrderTimelineTable";
import { DeliveryGanttChart } from "@/components/DeliveryGanttChart";
import { DriverPerformanceTable } from "@/components/DriverPerformanceTable";
import { AdvancedDateRangeSelector, type DateRange } from "@/components/AdvancedDateRangeSelector";

export function DeliveryReportTab() {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date(),
    preset: "last7days",
    reportType: "daily",
  });

  // Fetch delivery report metrics
  const { data: metrics, isLoading } = trpc.kitchen.getDeliveryReportMetrics.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  // Fetch order timelines
  const { data: timelines, isLoading: timelinesLoading } = trpc.kitchen.getOrderTimelines.useQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleExportCSV = () => {
    if (!timelines) return;
    
    const headers = ["Order ID", "Customer", "Address", "Pending Time", "Ready Time", "On the Way Time", "Delivered Time"];
    const rows = timelines.map(t => [
      t.orderId,
      t.customerName,
      t.customerAddress,
      t.durations.pending?.formatted || "N/A",
      t.durations.ready?.formatted || "N/A",
      t.durations.onTheWay?.formatted || "N/A",
      t.timestamps.delivered ? new Date(t.timestamps.delivered).toLocaleString() : "N/A",
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delivery-report-${dateRange.preset}.csv`;
    a.click();
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
      {!isLoading && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{metrics.totalOrders}</div>
              <p className="text-xs text-blue-700 mt-1">in selected period</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-900">Delivered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{metrics.deliveredOrders}</div>
              <p className="text-xs text-green-700 mt-1">completed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">Delivery Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{metrics.deliveryRate}%</div>
              <p className="text-xs text-purple-700 mt-1">completion rate</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Avg. Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{metrics.averageDeliveryTime}</div>
              <p className="text-xs text-orange-700 mt-1">minutes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Button */}
      <Button 
        onClick={handleExportCSV}
        className="w-full"
        variant="outline"
      >
        <Download className="w-4 h-4 mr-2" />
        Export as CSV
      </Button>

      {/* Delivery Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Order Timeline Visualization
          </CardTitle>
          <CardDescription>Visual representation of order progression through each status</CardDescription>
        </CardHeader>
        <CardContent>
          {timelinesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading chart...</div>
          ) : timelines && timelines.length > 0 ? (
            <DeliveryGanttChart timelines={timelines} isLoading={false} />
          ) : (
            <div className="text-center py-8 text-gray-500">No data available for selected period</div>
          )}
        </CardContent>
      </Card>

      {/* Order Timeline Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Order Status Timeline
          </CardTitle>
          <CardDescription>Detailed breakdown of each order's status transitions</CardDescription>
        </CardHeader>
        <CardContent>
          {timelinesLoading ? (
            <div className="text-center py-8 text-gray-500">Loading timelines...</div>
          ) : timelines && timelines.length > 0 ? (
            <OrderTimelineTable timelines={timelines} />
          ) : (
            <div className="text-center py-8 text-gray-500">No orders found for selected period</div>
          )}
        </CardContent>
      </Card>

      {/* Driver Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Driver Performance
          </CardTitle>
          <CardDescription>Performance metrics for all drivers in the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading driver data...</div>
          ) : (
            <DriverPerformanceTable timelines={timelines || []} isLoading={isLoading} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
