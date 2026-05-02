import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subWeeks,
  subMonths,
  format,
  isSameDay,
} from "date-fns";

export type ReportType = "daily" | "weekly" | "monthly";
export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisweek"
  | "lastweek"
  | "thismonth"
  | "lastmonth"
  | "custom";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateRangePreset;
  reportType: ReportType;
}

interface AdvancedDateRangeSelectorProps {
  onDateRangeChange: (dateRange: DateRange) => void;
  defaultPreset?: DateRangePreset;
  defaultReportType?: ReportType;
}

export const AdvancedDateRangeSelector: React.FC<
  AdvancedDateRangeSelectorProps
> = ({
  onDateRangeChange,
  defaultPreset = "today",
  defaultReportType = "daily",
}) => {
  const [preset, setPreset] = useState<DateRangePreset>(defaultPreset);
  const [reportType, setReportType] = useState<ReportType>(defaultReportType);
  const [customStartDate, setCustomStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [showCustom, setShowCustom] = useState(preset === "custom");

  const getDateRange = (selectedPreset: DateRangePreset): DateRange => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (selectedPreset) {
      case "today":
        startDate = startOfDay(today);
        endDate = endOfDay(today);
        break;
      case "yesterday":
        startDate = startOfDay(subDays(today, 1));
        endDate = endOfDay(subDays(today, 1));
        break;
      case "last7days":
        startDate = startOfDay(subDays(today, 6));
        endDate = endOfDay(today);
        break;
      case "last30days":
        startDate = startOfDay(subDays(today, 29));
        endDate = endOfDay(today);
        break;
      case "thisweek":
        startDate = startOfWeek(today, { weekStartsOn: 0 });
        endDate = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case "lastweek":
        const lastWeekDate = subWeeks(today, 1);
        startDate = startOfWeek(lastWeekDate, { weekStartsOn: 0 });
        endDate = endOfWeek(lastWeekDate, { weekStartsOn: 0 });
        break;
      case "thismonth":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case "lastmonth":
        const lastMonthDate = subMonths(today, 1);
        startDate = startOfMonth(lastMonthDate);
        endDate = endOfMonth(lastMonthDate);
        break;
      case "custom":
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        startDate = startOfDay(today);
        endDate = endOfDay(today);
    }

    return {
      startDate,
      endDate,
      preset: selectedPreset,
      reportType,
    };
  };

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    setShowCustom(newPreset === "custom");
    const dateRange = getDateRange(newPreset);
    onDateRangeChange(dateRange);
  };

  const handleReportTypeChange = (newReportType: ReportType) => {
    setReportType(newReportType);
    const dateRange = getDateRange(preset);
    dateRange.reportType = newReportType;
    onDateRangeChange(dateRange);
  };

  const handleCustomDateChange = () => {
    const dateRange = getDateRange("custom");
    onDateRangeChange(dateRange);
  };

  const formatDateDisplay = (): string => {
    const dateRange = getDateRange(preset);
    const start = format(dateRange.startDate, "MMM dd, yyyy");
    const end = format(dateRange.endDate, "MMM dd, yyyy");

    if (isSameDay(dateRange.startDate, dateRange.endDate)) {
      return start;
    }
    return `${start} - ${end}`;
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Report Type</h3>
        <div className="flex gap-2 flex-wrap">
          {(["daily", "weekly", "monthly"] as ReportType[]).map((type) => (
            <Button
              key={type}
              variant={reportType === type ? "default" : "outline"}
              onClick={() => handleReportTypeChange(type)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Date Range</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            variant={preset === "today" ? "default" : "outline"}
            onClick={() => handlePresetChange("today")}
            size="sm"
          >
            Today
          </Button>
          <Button
            variant={preset === "yesterday" ? "default" : "outline"}
            onClick={() => handlePresetChange("yesterday")}
            size="sm"
          >
            Yesterday
          </Button>
          <Button
            variant={preset === "last7days" ? "default" : "outline"}
            onClick={() => handlePresetChange("last7days")}
            size="sm"
          >
            Last 7 Days
          </Button>
          <Button
            variant={preset === "last30days" ? "default" : "outline"}
            onClick={() => handlePresetChange("last30days")}
            size="sm"
          >
            Last 30 Days
          </Button>
          <Button
            variant={preset === "thisweek" ? "default" : "outline"}
            onClick={() => handlePresetChange("thisweek")}
            size="sm"
          >
            This Week
          </Button>
          <Button
            variant={preset === "lastweek" ? "default" : "outline"}
            onClick={() => handlePresetChange("lastweek")}
            size="sm"
          >
            Last Week
          </Button>
          <Button
            variant={preset === "thismonth" ? "default" : "outline"}
            onClick={() => handlePresetChange("thismonth")}
            size="sm"
          >
            This Month
          </Button>
          <Button
            variant={preset === "lastmonth" ? "default" : "outline"}
            onClick={() => handlePresetChange("lastmonth")}
            size="sm"
          >
            Last Month
          </Button>
        </div>

        <Button
          variant={preset === "custom" ? "default" : "outline"}
          onClick={() => handlePresetChange("custom")}
          className="w-full"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Custom Date Range
        </Button>
      </div>

      {showCustom && (
        <div className="space-y-3 p-4 bg-muted rounded-lg">
          <h4 className="font-medium">Select Date Range</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
          <Button onClick={handleCustomDateChange} className="w-full">
            Apply Custom Range
          </Button>
        </div>
      )}

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Selected Period:</span> {formatDateDisplay()}
        </p>
        <p className="text-sm text-blue-800 mt-1">
          <span className="font-semibold">Report Type:</span> {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
        </p>
      </div>
    </Card>
  );
};
