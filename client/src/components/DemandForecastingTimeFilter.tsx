import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { DatePickerModal } from './DatePickerModal';

interface DemandForecastingTimeFilterProps {
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
  onModeChange?: (mode: 'single' | 'range') => void;
}

export function DemandForecastingTimeFilter({
  onDateRangeChange,
  onModeChange,
}: DemandForecastingTimeFilterProps) {
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [selectedDates, setSelectedDates] = useState<Date[]>([new Date()]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleDateSelection = (dates: Date[]) => {
    setSelectedDates(dates);
    
    if (mode === 'single' && dates.length > 0) {
      // Single date: analyze that specific day
      const date = dates[0];
      const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      onDateRangeChange(startDate, endDate);
    } else if (mode === 'range' && dates.length >= 2) {
      // Date range: analyze trend from first to last selected date
      const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = new Date(sortedDates[0].getFullYear(), sortedDates[0].getMonth(), sortedDates[0].getDate());
      const endDate = new Date(sortedDates[sortedDates.length - 1].getFullYear(), sortedDates[sortedDates.length - 1].getMonth(), sortedDates[sortedDates.length - 1].getDate() + 1);
      onDateRangeChange(startDate, endDate);
    }
  };

  const handleModeChange = (newMode: 'single' | 'range') => {
    setMode(newMode);
    setSelectedDates([new Date()]);
    onModeChange?.(newMode);
  };

  const getDateRangeLabel = () => {
    if (selectedDates.length === 0) return 'No dates selected';
    
    if (mode === 'single') {
      return selectedDates[0].toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } else {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = sortedDates[0].toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const endDate = sortedDates[sortedDates.length - 1].toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      return `${startDate} to ${endDate}`;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Demand Forecasting Time Filter
        </CardTitle>
        <CardDescription>
          Select a specific date or date range to analyze demand trends and forecast emerging zones
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selection */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            onClick={() => handleModeChange('single')}
            className="flex-1"
          >
            Single Date
          </Button>
          <Button
            variant={mode === 'range' ? 'default' : 'outline'}
            onClick={() => handleModeChange('range')}
            className="flex-1"
          >
            Date Range
          </Button>
        </div>

        {/* Date Display and Picker */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
          <div>
            <p className="text-sm text-slate-600">
              {mode === 'single' ? 'Selected Date:' : 'Selected Range:'}
            </p>
            <p className="text-lg font-semibold text-slate-900">{getDateRangeLabel()}</p>
          </div>
          <Button
            onClick={() => setIsDatePickerOpen(true)}
            variant="outline"
            size="sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Change
          </Button>
        </div>

        {/* Info Text */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            {mode === 'single'
              ? 'Analyze demand patterns and emerging zones for a specific date.'
              : 'Analyze demand trends and forecast emerging zones based on the selected date range.'}
          </p>
        </div>
      </CardContent>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        dateRange={mode === 'range' ? 'monthly' : 'daily'}
        onDateRangeChange={() => {}}
        selectedDates={selectedDates}
        onDatesChange={handleDateSelection}
        selectedMonths={[]}
        onMonthsChange={() => {}}
      />
    </Card>
  );
}
