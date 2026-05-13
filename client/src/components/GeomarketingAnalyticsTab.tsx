import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Map as MapIcon, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { DatePickerModal } from "./DatePickerModal";
import { AnalyticsSectionModalWithGIS } from "./AnalyticsSectionModalWithGIS";
import { DeliveryHeatmapAnalysis } from "./DeliveryHeatmapAnalysis";
import { DemandChangeAnalysisCard } from "./DemandChangeAnalysisCard";


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
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Calculate date range for queries
  const getDateRangeForQuery = () => {
    if (dateRange === "daily") {
      if (selectedDates.length === 0) return { startDate: new Date(), endDate: new Date() };
      const dates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      return {
        startDate: new Date(dates[0].getFullYear(), dates[0].getMonth(), dates[0].getDate()),
        endDate: new Date(dates[dates.length - 1].getFullYear(), dates[dates.length - 1].getMonth(), dates[dates.length - 1].getDate() + 1),
      };
    } else {
      if (selectedMonths.length === 0) {
        const now = new Date();
        return {
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        };
      }
      const months = [...selectedMonths].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
      return {
        startDate: new Date(months[0].year, months[0].month, 1),
        endDate: new Date(months[months.length - 1].year, months[months.length - 1].month + 1, 1),
      };
    }
  };

  const dateRangeQuery = getDateRangeForQuery();

  // Fetch analytics data for all 5 sections
  const { data: geographicData, isLoading: geoLoading } = trpc.analytics.getGeographicDistribution.useQuery(dateRangeQuery);
  const { data: timeData, isLoading: timeLoading } = trpc.analytics.getTimeAnalysis.useQuery(dateRangeQuery);
  const { data: performanceData, isLoading: perfLoading } = trpc.analytics.getDeliveryPerformance.useQuery(dateRangeQuery);
  const { data: driverData, isLoading: driverLoading } = trpc.analytics.getDriverPerformance.useQuery(dateRangeQuery);
  const { data: growthData, isLoading: growthLoading } = trpc.analytics.getGrowthOpportunities.useQuery(dateRangeQuery);

  const isLoading = geoLoading || timeLoading || perfLoading || driverLoading || growthLoading;

  const getDateRangeLabel = () => {
    if (dateRange === "daily") {
      return `${selectedDates.length} day${selectedDates.length !== 1 ? "s" : ""}`;
    } else {
      return `${selectedMonths.length} month${selectedMonths.length !== 1 ? "s" : ""}`;
    }
  };

  // Get top area from geographic data
  const getTopAreas = () => {
    if (!geographicData?.areaMetrics) return { area1: 0, area2: 0, area3: 0 };
    const areas = Object.entries(geographicData.areaMetrics)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3);
    return {
      area1: areas[0]?.[1]?.total || 0,
      area2: areas[1]?.[1]?.total || 0,
      area3: areas[2]?.[1]?.total || 0,
    };
  };

  const topAreas = getTopAreas();

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

      {/* Demand Change Analysis - Full Width */}
      <DemandChangeAnalysisCard />

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
                  {topAreas.area1}
                </p>
                <p className="text-xs text-blue-700">Top Area</p>
              </div>
              <div className="bg-green-50 rounded p-2 text-center">
                <p className="text-lg font-bold text-green-600">
                  {topAreas.area2}
                </p>
                <p className="text-xs text-green-700">2nd Area</p>
              </div>
              <div className="bg-orange-50 rounded p-2 text-center">
                <p className="text-lg font-bold text-orange-600">
                  {topAreas.area3}
                </p>
                <p className="text-xs text-orange-700">3rd Area</p>
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
                <p className="text-sm text-gray-500">
                  {timeData?.peakHour ? `Peak Hour: ${timeData.peakHour}:00` : "Click to view details"}
                </p>
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
                <p className="text-sm text-gray-500">
                  {driverData && Object.keys(driverData).length > 0 
                    ? `${Object.keys(driverData).length} drivers` 
                    : "Click to view details"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Geographical Analysis of Competitors */}
        <Card
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenSectionModal("growth")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="w-5 h-5" />
              Geographical Analysis of Competitors
            </CardTitle>
            <CardDescription>Analyze competitor locations and market opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {growthData?.topGrowthZones?.length ? `${growthData.topGrowthZones.length} zones` : "Click to view details"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Heatmap Analysis Card */}
        <Card
          className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setOpenSectionModal("heatmap")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapIcon className="w-5 h-5" />
              Delivery Heatmap Analysis
            </CardTitle>
            <CardDescription>Visualize delivery demand intensity across residential areas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Click to view heatmap analysis</p>
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
        data={geographicData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "time"}
        onClose={() => setOpenSectionModal(null)}
        title="Time Analysis"
        description="Order distribution by time of day and day of week"
        sectionType="time"
        data={timeData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "performance"}
        onClose={() => setOpenSectionModal(null)}
        title="Delivery Performance"
        description="Delivery times by location and area"
        sectionType="performance"
        data={performanceData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "driver"}
        onClose={() => setOpenSectionModal(null)}
        title="Driver Performance"
        description="Driver delivery locations and performance metrics"
        sectionType="driver"
        data={driverData}
      />

      <AnalyticsSectionModalWithGIS
        isOpen={openSectionModal === "growth"}
        onClose={() => setOpenSectionModal(null)}
        title="Geographical Analysis of Competitors"
        description="Analyze competitor locations and market opportunities"
        sectionType="growth"
        data={growthData}
      />

      {/* Delivery Heatmap Analysis Modal */}
      {openSectionModal === "heatmap" && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Delivery Heatmap Analysis</h2>
                <p className="text-gray-600 mt-1">Visualize delivery demand intensity across residential areas</p>
              </div>
              <button
                onClick={() => setOpenSectionModal(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <DeliveryHeatmapAnalysis dateRange={dateRangeQuery} areaFilter={areaFilter} />
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
