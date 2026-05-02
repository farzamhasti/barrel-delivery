import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';

interface CustomDateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function CustomDateTimePicker({ value, onChange }: CustomDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>(value);
  const [tempTime, setTempTime] = useState<string>(value ? value.split('T')[1] || '00:00' : '00:00');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [date, time] = value.split('T');
      setTempDate(date);
      setTempTime(time || '00:00');
    }
  }, [value, isOpen]);

  const handleOK = () => {
    if (tempDate && tempTime) {
      const dateTimeValue = `${tempDate}T${tempTime}`;
      onChange(dateTimeValue);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (value) {
      const [date, time] = value.split('T');
      setTempDate(date);
      setTempTime(time || '00:00');
    }
  };

  const displayValue = value
    ? new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      })
    : 'Select Date & Time';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-left flex items-center gap-2"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1">{displayValue}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-border rounded-lg shadow-lg p-4 z-50 w-80">
          <div className="space-y-4">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Date</label>
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Time Picker */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </label>
              <input
                type="time"
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Preview */}
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Preview:</p>
              <p className="text-sm font-semibold text-foreground">
                {tempDate && tempTime
                  ? new Date(`${tempDate}T${tempTime}`).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'No date/time selected'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleOK}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!tempDate || !tempTime}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
