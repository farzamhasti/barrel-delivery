import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DailyCalendarPickerProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
}

export function DailyCalendarPicker({
  selectedDates,
  onDatesChange,
}: DailyCalendarPickerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const days = useMemo(() => {
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);
    const daysArray = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      daysArray.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    return daysArray;
  }, [currentDate]);

  const isDateSelected = (date: Date | null) => {
    if (!date) return false;
    return selectedDates.some(
      (d) =>
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    );
  };

  const toggleDate = (date: Date) => {
    if (isDateSelected(date)) {
      onDatesChange(
        selectedDates.filter(
          (d) =>
            !(
              d.getFullYear() === date.getFullYear() &&
              d.getMonth() === date.getMonth() &&
              d.getDate() === date.getDate()
            )
        )
      );
    } else {
      onDatesChange([...selectedDates, date]);
    }
  };

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      {/* Month/Year Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-semibold text-gray-900">{monthYear}</h3>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => (
          <div key={index}>
            {date ? (
              <button
                onClick={() => toggleDate(date)}
                className={`w-full aspect-square rounded text-sm font-medium transition-colors ${
                  isDateSelected(date)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-50 text-gray-900 hover:bg-gray-100"
                }`}
              >
                {date.getDate()}
              </button>
            ) : (
              <div />
            )}
          </div>
        ))}
      </div>

      {/* Selected Days Summary */}
      {selectedDates.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            Selected: {selectedDates.length} day{selectedDates.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedDates
              .sort((a, b) => a.getTime() - b.getTime())
              .slice(0, 5)
              .map((date) => (
                <span
                  key={date.getTime()}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                >
                  {date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  <button
                    onClick={() => toggleDate(date)}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            {selectedDates.length > 5 && (
              <span className="text-xs text-gray-600 px-2 py-1">
                +{selectedDates.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Clear Button */}
      {selectedDates.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDatesChange([])}
          className="w-full mt-3"
        >
          Clear Selection
        </Button>
      )}
    </div>
  );
}
