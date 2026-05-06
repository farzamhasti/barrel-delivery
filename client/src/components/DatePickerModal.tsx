import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DailyCalendarPicker } from "./DailyCalendarPicker";
import { MonthlyCalendarPicker } from "./MonthlyCalendarPicker";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange: "daily" | "monthly";
  onDateRangeChange: (range: "daily" | "monthly") => void;
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  selectedMonths: { year: number; month: number }[];
  onMonthsChange: (months: { year: number; month: number }[]) => void;
}

export function DatePickerModal({
  isOpen,
  onClose,
  dateRange,
  onDateRangeChange,
  selectedDates,
  onDatesChange,
  selectedMonths,
  onMonthsChange,
}: DatePickerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Date Range</DialogTitle>
          <DialogDescription>
            Choose dates for your analytics report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Range Toggle */}
          <div className="flex gap-2">
            <Button
              variant={dateRange === "daily" ? "default" : "outline"}
              onClick={() => onDateRangeChange("daily")}
              className="flex-1"
            >
              Daily
            </Button>
            <Button
              variant={dateRange === "monthly" ? "default" : "outline"}
              onClick={() => onDateRangeChange("monthly")}
              className="flex-1"
            >
              Monthly
            </Button>
          </div>

          {/* Calendar Pickers */}
          <div className="max-h-96 overflow-y-auto">
            {dateRange === "daily" && (
              <DailyCalendarPicker
                selectedDates={selectedDates}
                onDatesChange={onDatesChange}
              />
            )}
            {dateRange === "monthly" && (
              <MonthlyCalendarPicker
                selectedMonths={selectedMonths}
                onMonthsChange={onMonthsChange}
              />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
