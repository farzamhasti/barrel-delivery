import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";

interface DailyCalendarModalProps {
  isOpen: boolean;
  selectedDays: Date[];
  onDaysChange: (days: Date[]) => void;
  onClose: () => void;
}

export function DailyCalendarModal({
  isOpen,
  selectedDays,
  onDaysChange,
  onClose,
}: DailyCalendarModalProps) {
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  if (!isOpen) return null;

  const getDaysInCalendar = () => {
    const firstDay = startOfMonth(calendarMonth);
    const lastDay = endOfMonth(calendarMonth);
    return eachDayOfInterval({ start: firstDay, end: lastDay });
  };

  const getStartingDayOfWeek = () => {
    return startOfMonth(calendarMonth).getDay();
  };

  const handleDayClick = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    const selectedStr = selectedDays.map((d) => d.toISOString().split("T")[0]);

    if (selectedStr.includes(dayStr)) {
      onDaysChange(selectedDays.filter((d) => d.toISOString().split("T")[0] !== dayStr));
    } else {
      onDaysChange([...selectedDays, day]);
    }
  };

  const daysInCalendar = getDaysInCalendar();
  const startingDayOfWeek = getStartingDayOfWeek();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Select Days</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)
              )
            }
          >
            ←
          </Button>
          <span className="text-sm font-semibold">{format(calendarMonth, "MMMM yyyy")}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCalendarMonth(
                new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)
              )
            }
          >
            →
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="mb-4">
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

        {/* Selected Days Display */}
        {selectedDays.length > 0 && (
          <div className="bg-blue-50 rounded p-3 mb-4">
            <p className="text-xs font-semibold text-blue-900 mb-2">
              {selectedDays.length} day(s) selected:
            </p>
            <div className="flex flex-wrap gap-2">
              {[...selectedDays]
                .sort((a, b) => a.getTime() - b.getTime())
                .map((day) => (
                  <span key={day.toISOString().split("T")[0]} className="text-xs bg-blue-200 text-blue-900 px-2 py-1 rounded">
                    {format(day, "MMM d")}
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
