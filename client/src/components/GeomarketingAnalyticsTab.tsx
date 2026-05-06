import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Map as MapIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DailyCalendarPicker } from "./DailyCalendarPicker";
import { MonthlyCalendarPicker } from "./MonthlyCalendarPicker";

type DateRange = "daily" | "monthly";
type AreaFilter = "all" | "Downtown" | "Central Park" | "Both";

export function GeomarketingAnalyticsTab() {
  const [dateRange, setDateRange] = useState<DateRange>("daily");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [selectedMonths, setSelectedMonths] = useState<{ year: number; month: number }[]>([
    { year: new Date().getFullYear(), month: new Date().getMonth() },
  ]);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = trpc.analytics.getGeomarketingData.useQuery(
    {
      dateRange,
      area: areaFilter === "all" ? undefined : areaFilter,
      dates: dateRange === "daily" ? selectedDates : undefined,
      months: dateRange === "monthly" ? selectedMonths : undefined,
    },
    {
      enabled: true,
    }
  );

  return (
    <div className="space-y-6">
      {/* Global Controls */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex gap-2 mb-4">
                <Button
                  variant={dateRange === "daily" ? "default" : "outline"}
                  onClick={() => setDateRange("daily")}
                  size="sm"
                >
                  Daily
                </Button>
                <Button
                  variant={dateRange === "monthly" ? "default" : "outline"}
                  onClick={() => setDateRange("monthly")}
                  size="sm"
                >
                  Monthly
                </Button>
              </div>

              {/* Calendar Pickers */}
              {dateRange === "daily" && (
                <DailyCalendarPicker
                  selectedDates={selectedDates}
                  onDatesChange={setSelectedDates}
                />
              )}
              {dateRange === "monthly" && (
                <MonthlyCalendarPicker
                  selectedMonths={selectedMonths}
                  onMonthsChange={setSelectedMonths}
                />
              )}
            </div>

            {/* Area Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area
              </label>
              <div className="flex flex-col gap-2">
                <Button
                  variant={areaFilter === "all" ? "default" : "outline"}
                  onClick={() => setAreaFilter("all")}
                  size="sm"
                >
                  All
                </Button>
                <Button
                  variant={areaFilter === "Downtown" ? "default" : "outline"}
                  onClick={() => setAreaFilter("Downtown")}
                  size="sm"
                >
                  Downtown
                </Button>
                <Button
                  variant={areaFilter === "Central Park" ? "default" : "outline"}
                  onClick={() => setAreaFilter("Central Park")}
                  size="sm"
                >
                  Central Park
                </Button>
                <Button
                  variant={areaFilter === "Both" ? "default" : "outline"}
                  onClick={() => setAreaFilter("Both")}
                  size="sm"
                >
                  Both
                </Button>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-sm text-gray-900 mb-2">Active Filters</h4>
              <div className="space-y-1 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Date Range:</span>{" "}
                  {dateRange === "daily"
                    ? `${selectedDates.length} day${selectedDates.length !== 1 ? "s" : ""}`
                    : `${selectedMonths.length} month${selectedMonths.length !== 1 ? "s" : ""}`}
                </p>
                <p>
                  <span className="font-medium">Area:</span>{" "}
                  {areaFilter === "all" ? "All Areas" : areaFilter}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Geographic Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>
            Heatmap of delivery locations and order volume by area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map placeholder */}
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Map View (Heatmap)</p>
                <p className="text-xs text-gray-400 mt-1">Geographic Distribution Map</p>
              </div>
            </div>

            {/* Chart/Table */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {analyticsData?.geographicStats?.downtown || 0}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">Downtown</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {analyticsData?.geographicStats?.centralPark || 0}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Central Park</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {analyticsData?.geographicStats?.both || 0}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">Both</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Bar Chart</p>
                  <p className="text-xs text-gray-400 mt-1">Orders per Area</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Time Analysis */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Time Analysis
          </CardTitle>
          <CardDescription>
            Order distribution by time of day and day of week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map placeholder */}
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Map View (Time-Colored)</p>
                <p className="text-xs text-gray-400 mt-1">Morning/Afternoon/Evening/Night</p>
              </div>
            </div>

            {/* Chart/Table */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 h-80 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Time Charts</p>
                  <p className="text-xs text-gray-400 mt-1">Orders by Hour & Day of Week</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Delivery Performance */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Delivery Performance
          </CardTitle>
          <CardDescription>
            Delivery times by location and area
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map placeholder */}
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Map View (Performance)</p>
                <p className="text-xs text-gray-400 mt-1">Green/Yellow/Red by Delivery Time</p>
              </div>
            </div>

            {/* Chart/Table */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 h-80 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Performance Table</p>
                  <p className="text-xs text-gray-400 mt-1">Average Times per Area</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Driver Performance */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Driver Performance
          </CardTitle>
          <CardDescription>
            Driver delivery locations and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map placeholder */}
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Map View (Driver-Colored)</p>
                <p className="text-xs text-gray-400 mt-1">Each Driver in Different Color</p>
              </div>
            </div>

            {/* Chart/Table */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 h-80 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Driver Table & Chart</p>
                  <p className="text-xs text-gray-400 mt-1">Orders, Avg Time, Frequent Area</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Growth Opportunities */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapIcon className="w-5 h-5" />
            Growth Opportunities
          </CardTitle>
          <CardDescription>
            Identify areas for expansion and optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Map placeholder */}
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Map View (Opportunities)</p>
                <p className="text-xs text-gray-400 mt-1">Yellow/Red/Green Zones</p>
              </div>
            </div>

            {/* Chart/Table */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 h-80 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Recommendations</p>
                  <p className="text-xs text-gray-400 mt-1">Growth Zones & Promotion Times</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
