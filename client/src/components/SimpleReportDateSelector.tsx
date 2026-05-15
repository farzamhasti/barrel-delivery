import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, X } from "lucide-react";
import { format } from "date-fns";
import { DailyCalendarModal } from "@/components/DailyCalendarModal";
import { MonthlyCalendarModal } from "@/components/MonthlyCalendarModal";

type ReportType = "daily" | "monthly";

interface SimpleReportDateSelectorProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

export function SimpleReportDateSelector({ onDateRangeChange }: SimpleReportDateSelectorProps) {
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [selectedDays, setSelectedDays] = useState<Date[]>([new Date()]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    new Date().toISOString().slice(0, 7),
  ]);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  const handleApply = () => {
    if (reportType === "daily") {
      if (selectedDays.length === 0) return;
      const sortedDays = [...selectedDays].sort((a, b) => a.getTime() - b.getTime());
      const startDate = new Date(sortedDays[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(sortedDays[sortedDays.length - 1]);
      endDate.setHours(23, 59, 59, 999);
      onDateRangeChange(startDate, endDate);
    } else {
      if (selectedMonths.length === 0) return;
      const sortedMonths = [...selectedMonths].sort();
      const startDate = new Date(`${sortedMonths[0]}-01`);
      startDate.setHours(0, 0, 0, 0);
      const endMonth = sortedMonths[sortedMonths.length - 1];
      const [year, month] = endMonth.split("-").map(Number);
      // JavaScript Date uses 0-indexed months, so month 5 (May) should be passed as 5 to get June 1st, then day 0 gives us May 31st
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      onDateRangeChange(startDate, endDate);
    }
  };

  const handleRemoveDay = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    setSelectedDays(selectedDays.filter((d) => d.toISOString().split("T")[0] !== dayStr));
  };

  const handleRemoveMonth = (month: string) => {
    setSelectedMonths(selectedMonths.filter((m) => m !== month));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Report Configuration
        </CardTitle>
        <CardDescription>Select report type and date range</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Report Type</label>
          <div className="flex gap-3">
            <Button
              onClick={() => setReportType("daily")}
              variant={reportType === "daily" ? "default" : "outline"}
              className="flex-1"
            >
              Daily
            </Button>
            <Button
              onClick={() => setReportType("monthly")}
              variant={reportType === "monthly" ? "default" : "outline"}
              className="flex-1"
            >
              Monthly
            </Button>
          </div>
        </div>

        {/* Date Selection Buttons */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">
            {reportType === "daily" ? "Select Days" : "Select Months"}
          </label>
          <Button
            onClick={() => {
              if (reportType === "daily") {
                setShowDailyModal(true);
              } else {
                setShowMonthlyModal(true);
              }
            }}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Calendar className="w-4 h-4 mr-2" />
            {reportType === "daily"
              ? `Choose Days (${selectedDays.length} selected)`
              : `Choose Months (${selectedMonths.length} selected)`}
          </Button>
        </div>

        {/* Selected Items Display */}
        {(selectedDays.length > 0 || selectedMonths.length > 0) && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600">SELECTED:</p>
            <div className="flex flex-wrap gap-2">
              {reportType === "daily" &&
                [...selectedDays]
                  .sort((a, b) => a.getTime() - b.getTime())
                  .map((day) => (
                    <div
                      key={day.toISOString().split("T")[0]}
                      className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
                    >
                      {format(day, "MMM d, yyyy")}
                      <button
                        onClick={() => handleRemoveDay(day)}
                        className="hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              {reportType === "monthly" &&
                [...selectedMonths].sort().map((month) => {
                  const [year, monthNum] = month.split("-").map(Number);
                  const date = new Date(year, monthNum - 1, 1);
                  return (
                  <div
                    key={month}
                    className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
                  >
                    {format(date, "MMMM yyyy")}
                    <button
                      onClick={() => handleRemoveMonth(month)}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
                })}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <Button onClick={handleApply} className="w-full" size="lg">
          Generate Report
        </Button>
      </CardContent>

      {/* Modals */}
      <DailyCalendarModal
        isOpen={showDailyModal}
        selectedDays={selectedDays}
        onDaysChange={setSelectedDays}
        onClose={() => setShowDailyModal(false)}
      />
      <MonthlyCalendarModal
        isOpen={showMonthlyModal}
        selectedMonths={selectedMonths}
        onMonthsChange={setSelectedMonths}
        onClose={() => setShowMonthlyModal(false)}
      />
    </Card>
  );
}
