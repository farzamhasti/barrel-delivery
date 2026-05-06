import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "lucide-react";

type ReportType = "daily" | "monthly";

interface SimpleReportDateSelectorProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

export function SimpleReportDateSelector({ onDateRangeChange }: SimpleReportDateSelectorProps) {
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [selectedDays, setSelectedDays] = useState<Date[]>([new Date()]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    new Date().toISOString().slice(0, 7), // YYYY-MM format
  ]);

  // Get last 12 months for selection
  const getMonthOptions = () => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        value: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      });
    }
    return months;
  };

  // Get last 30 days for selection
  const getDayOptions = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  };

  const handleDayToggle = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    const selectedStr = selectedDays.map((d) => d.toISOString().split("T")[0]);

    if (selectedStr.includes(dayStr)) {
      setSelectedDays(selectedDays.filter((d) => d.toISOString().split("T")[0] !== dayStr));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleMonthToggle = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter((m) => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

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
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      onDateRangeChange(startDate, endDate);
    }
  };

  const monthOptions = getMonthOptions();
  const dayOptions = getDayOptions();

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

        {/* Daily Date Selection */}
        {reportType === "daily" && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Select Days ({selectedDays.length} selected)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {dayOptions.map((day) => {
                const dayStr = day.toISOString().split("T")[0];
                const isSelected = selectedDays.some(
                  (d) => d.toISOString().split("T")[0] === dayStr
                );
                return (
                  <label
                    key={dayStr}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleDayToggle(day)}
                    />
                    <span className="text-sm text-gray-700">
                      {day.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Date Selection */}
        {reportType === "monthly" && (
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">
              Select Months ({selectedMonths.length} selected)
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {monthOptions.map((month) => {
                const isSelected = selectedMonths.includes(month.value);
                return (
                  <label
                    key={month.value}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleMonthToggle(month.value)}
                    />
                    <span className="text-sm text-gray-700">{month.label}</span>
                  </label>
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
    </Card>
  );
}
