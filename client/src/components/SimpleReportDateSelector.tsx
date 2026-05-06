import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";

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
  
  // Calendar navigation
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthPickerYear, setMonthPickerYear] = useState(new Date().getFullYear());

  // Get days in the calendar view
  const getDaysInCalendar = () => {
    const firstDay = startOfMonth(calendarMonth);
    const lastDay = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start: firstDay, end: lastDay });
  };

  // Get starting day of week (0 = Sunday)
  const getStartingDayOfWeek = () => {
    return startOfMonth(calendarMonth).getDay();
  };

  const handleDayClick = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    const selectedStr = selectedDays.map((d) => d.toISOString().split("T")[0]);

    if (selectedStr.includes(dayStr)) {
      setSelectedDays(selectedDays.filter((d) => d.toISOString().split("T")[0] !== dayStr));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleMonthClick = (month: string) => {
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

  const daysInCalendar = getDaysInCalendar();
  const startingDayOfWeek = getStartingDayOfWeek();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Get months for the year picker
  const getMonthsForYear = (year: number) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(year, i, 1);
      months.push({
        value: date.toISOString().slice(0, 7),
        label: format(date, "MMM"),
      });
    }
    return months;
  };

  const monthsForYear = getMonthsForYear(monthPickerYear);

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

        {/* Daily Calendar Picker */}
        {reportType === "daily" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Select Days ({selectedDays.length} selected)
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                >
                  ←
                </Button>
                <span className="text-sm font-medium px-3 py-1">
                  {format(calendarMonth, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                >
                  →
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-gray-200 rounded-lg p-4">
              {/* Week day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Days of the month */}
                {daysInCalendar.map((day) => {
                  const dayStr = day.toISOString().split("T")[0];
                  const isSelected = selectedDays.some(
                    (d) => d.toISOString().split("T")[0] === dayStr
                  );
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={dayStr}
                      onClick={() => handleDayClick(day)}
                      className={`aspect-square rounded text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : isToday
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Picker */}
        {reportType === "monthly" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Select Months ({selectedMonths.length} selected)
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthPickerYear(monthPickerYear - 1)}
                >
                  ←
                </Button>
                <span className="text-sm font-medium px-3 py-1">{monthPickerYear}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthPickerYear(monthPickerYear + 1)}
                >
                  →
                </Button>
              </div>
            </div>

            {/* Month Grid */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-2">
                {monthsForYear.map((month) => {
                  const isSelected = selectedMonths.includes(month.value);
                  const isCurrentMonth =
                    month.value === new Date().toISOString().slice(0, 7);

                  return (
                    <button
                      key={month.value}
                      onClick={() => handleMonthClick(month.value)}
                      className={`py-3 rounded font-medium text-sm transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : isCurrentMonth
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {month.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Selected Items Display */}
        {(selectedDays.length > 0 || selectedMonths.length > 0) && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
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
                        onClick={() => handleDayClick(day)}
                        className="hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
              {reportType === "monthly" &&
                [...selectedMonths].sort().map((month) => (
                  <div
                    key={month}
                    className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2"
                  >
                    {format(new Date(`${month}-01`), "MMMM yyyy")}
                    <button
                      onClick={() => handleMonthClick(month)}
                      className="hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
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
