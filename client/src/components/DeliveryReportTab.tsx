import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, Truck, CheckCircle2, Download, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { OrderTimelineTable } from "@/components/OrderTimelineTable";
import { DeliveryGanttChart } from "@/components/DeliveryGanttChart";
import { DriverPerformanceTable } from "@/components/DriverPerformanceTable";

export function DeliveryReportTab() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)),
    end: new Date(),
  });

  // Fetch delivery report metrics
  const { data: metrics, isLoading } = trpc.kitchen.getDeliveryReportMetrics.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  // Fetch order timelines
  const { data: timelines, isLoading: timelinesLoading } = trpc.kitchen.getOrderTimelines.useQuery({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const handlePreviousWeek = () => {
    setDateRange({
      start: new Date(dateRange.start.setDate(dateRange.start.getDate() - 7)),
      end: new Date(dateRange.end.setDate(dateRange.end.getDate() - 7)),
    });
  };

  const handleCurrentWeek = () => {
    setDateRange({
      start: new Date(new Date().setDate(new Date().getDate() - 7)),
      end: new Date(),
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const exportToCSV = () => {
    if (!timelines || timelines.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = ["Order ID", "Customer", "Address", "Pending Time", "Ready Time", "On Way Time", "Delivered Time", "Total Duration"];
    const rows = timelines.map((timeline: any) => [
      timeline.orderId,
      timeline.customerName,
      timeline.address,
      timeline.pendingTime || "N/A",
      timeline.readyTime || "N/A",
      timeline.onWayTime || "N/A",
      timeline.deliveredTime || "N/A",
      timeline.totalDuration || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `delivery-report-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    alert("PDF export feature coming soon. Please use CSV export for now.");
  };

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Report Period
          </CardTitle>
          <CardDescription>
            {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={handlePreviousWeek}>
            Previous Week
          </Button>
          <Button variant="outline" onClick={handleCurrentWeek}>
            Current Week
          </Button>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      {isLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading delivery metrics...</p>
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Orders */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">Orders created</p>
            </CardContent>
          </Card>

          {/* Delivered Orders */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Delivered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{metrics.deliveredOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully delivered</p>
            </CardContent>
          </Card>

          {/* Delivery Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Delivery Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{metrics.deliveryRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Completion rate</p>
            </CardContent>
          </Card>

          {/* Average Delivery Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-500" />
                Avg. Delivery Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{metrics.averageDeliveryTime}</div>
              <p className="text-xs text-muted-foreground mt-1">Minutes per delivery</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No delivery data available for this period</p>
        </div>
      )}

      {/* Summary Card */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Summary</CardTitle>
            <CardDescription>
              Performance overview for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-muted-foreground mb-1">Pending Delivery</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metrics.totalOrders - metrics.deliveredOrders}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((metrics.totalOrders - metrics.deliveredOrders) / metrics.totalOrders * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-muted-foreground mb-1">On-Time Performance</p>
                <p className="text-2xl font-bold text-green-600">{metrics.deliveryRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.deliveredOrders} of {metrics.totalOrders} delivered
                </p>
              </div>
            </div>

            {metrics.averageDeliveryTime > 20 && (
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-semibold text-orange-900 mb-1">⚠️ Performance Alert</p>
                <p className="text-xs text-orange-800">
                  Average delivery time is {metrics.averageDeliveryTime} minutes. Consider optimizing delivery routes or driver assignments.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Report
          </CardTitle>
          <CardDescription>
            Download delivery report in your preferred format
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}
            className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export as CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}
            className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export as PDF
          </Button>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Delivery Timeline Visualization
          </CardTitle>
          <CardDescription>
            Visual representation of order progression over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeliveryGanttChart timelines={timelines || []} isLoading={timelinesLoading} />
        </CardContent>
      </Card>

      {/* Driver Performance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Driver Performance Breakdown
          </CardTitle>
          <CardDescription>
            Individual driver metrics and performance comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriverPerformanceTable timelines={timelines || []} isLoading={timelinesLoading} />
        </CardContent>
      </Card>

      {/* Order Timeline Table */}
      <Card>
        <CardHeader>
          <CardTitle>Order Status Timeline</CardTitle>
          <CardDescription>
            Detailed timeline showing each order's progression through all statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrderTimelineTable timelines={timelines || []} isLoading={timelinesLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
