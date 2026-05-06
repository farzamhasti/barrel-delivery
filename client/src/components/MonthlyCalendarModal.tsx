import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";

interface MonthlyCalendarModalProps {
  isOpen: boolean;
  selectedMonths: string[];
  onMonthsChange: (months: string[]) => void;
  onClose: () => void;
}

export function MonthlyCalendarModal({
  isOpen,
  selectedMonths,
  onMonthsChange,
  onClose,
}: MonthlyCalendarModalProps) {
  const [year, setYear] = useState(new Date().getFullYear());

  if (!isOpen) return null;

  const getMonthsForYear = (selectedYear: number) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(selectedYear, i, 1);
      months.push({
        value: date.toISOString().slice(0, 7),
        label: format(date, "MMM"),
      });
    }
    return months;
  };

  const handleMonthClick = (month: string) => {
    if (selectedMonths.includes(month)) {
      onMonthsChange(selectedMonths.filter((m) => m !== month));
    } else {
      onMonthsChange([...selectedMonths, month]);
    }
  };

  const monthsForYear = getMonthsForYear(year);
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Select Months</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Year Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => setYear(year - 1)}>
            ←
          </Button>
          <span className="text-sm font-semibold">{year}</span>
          <Button variant="outline" size="sm" onClick={() => setYear(year + 1)}>
            →
          </Button>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {monthsForYear.map((month) => {
            const isSelected = selectedMonths.includes(month.value);
            const isCurrentMonth = month.value === currentMonth;

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

        {/* Selected Months Display */}
        {selectedMonths.length > 0 && (
          <div className="bg-blue-50 rounded p-3 mb-4">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              {selectedMonths.length} month(s) selected:
            </p>
            <div className="flex flex-wrap gap-2">
              {[...selectedMonths]
                .sort()
                .map((month) => (
                  <span key={month} className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded">
                    {format(new Date(`${month}-01`), "MMM yyyy")}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
