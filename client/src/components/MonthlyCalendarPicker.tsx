import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MonthlyCalendarPickerProps {
  selectedMonths: { year: number; month: number }[];
  onMonthsChange: (months: { year: number; month: number }[]) => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function MonthlyCalendarPicker({
  selectedMonths,
  onMonthsChange,
}: MonthlyCalendarPickerProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const isMonthSelected = (year: number, month: number) => {
    return selectedMonths.some((m) => m.year === year && m.month === month);
  };

  const toggleMonth = (year: number, month: number) => {
    if (isMonthSelected(year, month)) {
      onMonthsChange(
        selectedMonths.filter((m) => !(m.year === year && m.month === month))
      );
    } else {
      onMonthsChange([...selectedMonths, { year, month }]);
    }
  };

  const previousYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const nextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      {/* Year Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousYear}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-gray-900">{currentYear}</h3>
        <button onClick={nextYear} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {MONTHS.map((month, index) => (
          <button
            key={index}
            onClick={() => toggleMonth(currentYear, index)}
            className={`py-2 px-3 rounded text-sm font-medium transition-colors ${
              isMonthSelected(currentYear, index)
                ? "bg-blue-600 text-white"
                : "bg-gray-50 text-gray-900 hover:bg-gray-100"
            }`}
          >
            {month.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Selected Months Summary */}
      {selectedMonths.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Selected: {selectedMonths.length} month{selectedMonths.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedMonths
              .sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
              })
              .slice(0, 6)
              .map((m) => (
                <span
                  key={`${m.year}-${m.month}`}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                >
                  {MONTHS[m.month].slice(0, 3)} {m.year}
                  <button
                    onClick={() => toggleMonth(m.year, m.month)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            {selectedMonths.length > 6 && (
              <span className="text-xs text-gray-600 px-2 py-1">
                +{selectedMonths.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Clear Button */}
      {selectedMonths.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMonthsChange([])}
          className="w-full mt-3"
        >
          Clear Selection
        </Button>
      )}
    </div>
  );
}
