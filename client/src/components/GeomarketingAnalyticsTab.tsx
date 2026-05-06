import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Map as MapIcon, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DatePickerModal } from "./DatePickerModal";
import { AnalyticsSectionModalWithGIS } from "./AnalyticsSectionModalWithGIS";

type DateRange = "daily" | "monthly";
type AreaFilter = "all" | "Downtown" | "Central Park" | "Both";

export function GeomarketingAnalyticsTab() {
  const [dateRange, setDateRange] = useState<DateRange>("daily");
  const [areaFilter, setAreaFilter] = useState<AreaFilter>("all");
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [selectedMonths, setSelectedMonths] = useState<{ year: number; month: number }[]>([
    { year: new Date().getFullYear(), month: new Date().getMonth() },
  ]);

  // Modal states
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [openSectionModal, setOpenSectionModal] = useState<string | null>(null);

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

  const getDateRangeLabel = () => {
    if (dateRange === "daily") {
      return `${selectedDates.length} day${selectedDates.length !== 1 ? "s" : ""}`;
    } else {
      return `${selectedMonths.length} month${selectedMonths.length !== 1 ? "s" : ""}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Controls Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="flex gap-2">
                <Button
                  variant={dateRange === "daily" ? "default" : "outline"}
                  onClick={() => setDateRange("daily")}
                  size="sm"
                  className="flex-1"
                >
                  Daily
                </Button>
                <Button
                  variant={dateRange === "monthly" ? "default" : "outline"}
                  onClick={() => setDateRange("monthly")}
                  size="sm"
                  className="flex-1"
                >
                  Monthly
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsDatePickerOpen(true)}
                size="sm"
                className="w-full mt-2"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Select Dates ({getDateRangeLabel()})
              </Button>
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
                  <span className="font-medium">Date Range:</span> {getDateRangeLabel()}
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

      {/* Analytics Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section 1: Geographic Distribution */}
        <Card
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenSectionModal("geographic")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="w-5 h-5" />
              Geographic Distribution
            </CardTitle>
            <CardDescription>Heatmap of delivery locations and order volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to view details</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-blue-50 rounded p-2 text-center">
                <p className="text-lg font-bold text-blue-600">
                  {analyticsData?.geographicStats?.downtown || 0}
                </p>
                <p className="text-xs text-blue-700">Downtown</p>
              </div>
              <div className="bg-green-50 rounded p-2 text-center">
                <p className="text-lg font-bold text-green-600">
                  {analyticsData?.geographicStats?.centralPark || 0}
                </p>
                <p className="text-xs text-green-700">Central Park</p>
              </div>
              <div className="bg-orange-50 rounded p-2 text-center">
                <p className="text-lg font-bold text-orange-600">
                  {analyticsData?.geographicStats?.both || 0}
                </p>
                <p className="text-xs text-orange-700">Both</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Time Analysis */}
        <Card
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenSectionModal("time")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5" />
              Time Analysis
            </CardTitle>
            <CardDescription>Order distribution by time of day and week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to view details</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Delivery Performance */}
        <Card
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenSectionModal("performance")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="w-5 h-5" />
              Delivery Performance
            </CardTitle>
            <CardDescription>Delivery times by location and area</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to view details</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Driver Performance */}
        <Card
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenSectionModal("driver")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5" />
              Driver Performance
            </CardTitle>
            <CardDescription>Driver delivery locations and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to view details</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Growth Opportunities */}
        <Card
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenSectionModal("growth")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="w-5 h-5" />
              Growth Opportunities
            </CardTitle>
            <CardDescription>Identify areas for expansion and optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to view details</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedDates={selectedDates}
        onDatesChange={setSelectedDates}
        selectedMonths={selectedMonths}
        onMonthsChange={setSelectedMonths}
      />

      {/* Analytics Section Modals with GIS */}
      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "geographic"}
        onClose={() => setOpenSectionModal(null)}
        title="Geographic Distribution"
        description="Heatmap of delivery locations and order volume by area"
        sectionType="geographic"
        data={analyticsData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "time"}
        onClose={() => setOpenSectionModal(null)}
        title="Time Analysis"
        description="Order distribution by time of day and day of week"
        sectionType="time"
        data={analyticsData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "performance"}
        onClose={() => setOpenSectionModal(null)}
        title="Delivery Performance"
        description="Delivery times by location and area"
        sectionType="performance"
        data={analyticsData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "driver"}
        onClose={() => setOpenSectionModal(null)}
        title="Driver Performance"
        description="Driver delivery locations and performance metrics"
        sectionType="driver"
        data={analyticsData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "growth"}
        onClose={() => setOpenSectionModal(null)}
        title="Growth Opportunities"
        description="Identify areas for expansion and optimization"
        sectionType="growth"
        data={analyticsData}
      />
    </div>
  );
}
