import { describe, it, expect } from 'vitest';

/**
 * Unit tests for monthly comparison date calculation logic
 * Tests the logic for calculating date ranges for monthly comparisons
 */

interface MonthlyComparisonParams {
  selectedMonth: number;
  selectedYear: number;
  comparisonMode: 'previous-month' | 'previous-year';
}

interface DateRanges {
  currentStartDate: Date;
  currentEndDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
}

/**
 * Calculate date ranges for monthly comparison
 * Mirrors the logic in DemandChangeAnalysisCard.tsx
 */
function calculateMonthlyDateRanges(params: MonthlyComparisonParams): DateRanges {
  const { selectedMonth, selectedYear, comparisonMode } = params;

  // Get the first and last day of the selected month
  const currentStartDate = new Date(selectedYear, selectedMonth, 1);
  const currentEndDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

  let previousStartDate: Date;
  let previousEndDate: Date;

  if (comparisonMode === 'previous-month') {
    // Compare with previous month
    previousStartDate = new Date(selectedYear, selectedMonth - 1, 1);
    previousEndDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
  } else {
    // Compare with same month previous year
    previousStartDate = new Date(selectedYear - 1, selectedMonth, 1);
    previousEndDate = new Date(selectedYear - 1, selectedMonth + 1, 0, 23, 59, 59, 999);
  }

  return {
    currentStartDate,
    currentEndDate,
    previousStartDate,
    previousEndDate,
  };
}

describe('Monthly Comparison Date Calculation', () => {
  describe('Previous Month Comparison', () => {
    it('should calculate May 2026 vs April 2026', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 4, // May (0-indexed)
        selectedYear: 2026,
        comparisonMode: 'previous-month',
      });

      // Current period: May 2026
      expect(result.currentStartDate.getMonth()).toBe(4);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentStartDate.getFullYear()).toBe(2026);

      expect(result.currentEndDate.getMonth()).toBe(4);
      expect(result.currentEndDate.getDate()).toBe(31);
      expect(result.currentEndDate.getFullYear()).toBe(2026);

      // Comparison period: April 2026
      expect(result.previousStartDate.getMonth()).toBe(3);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousStartDate.getFullYear()).toBe(2026);

      expect(result.previousEndDate.getMonth()).toBe(3);
      expect(result.previousEndDate.getDate()).toBe(30);
      expect(result.previousEndDate.getFullYear()).toBe(2026);
    });

    it('should handle January 2026 vs December 2025', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 0, // January (0-indexed)
        selectedYear: 2026,
        comparisonMode: 'previous-month',
      });

      // Current period: January 2026
      expect(result.currentStartDate.getMonth()).toBe(0);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentStartDate.getFullYear()).toBe(2026);

      expect(result.currentEndDate.getMonth()).toBe(0);
      expect(result.currentEndDate.getDate()).toBe(31);
      expect(result.currentEndDate.getFullYear()).toBe(2026);

      // Comparison period: December 2025
      expect(result.previousStartDate.getMonth()).toBe(11);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousStartDate.getFullYear()).toBe(2025);

      expect(result.previousEndDate.getMonth()).toBe(11);
      expect(result.previousEndDate.getDate()).toBe(31);
      expect(result.previousEndDate.getFullYear()).toBe(2025);
    });

    it('should handle February 2026 vs January 2026', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 1, // February (0-indexed)
        selectedYear: 2026,
        comparisonMode: 'previous-month',
      });

      // Current period: February 2026 (28 days, non-leap year)
      expect(result.currentStartDate.getMonth()).toBe(1);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentEndDate.getMonth()).toBe(1);
      expect(result.currentEndDate.getDate()).toBe(28);

      // Comparison period: January 2026
      expect(result.previousStartDate.getMonth()).toBe(0);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousEndDate.getMonth()).toBe(0);
      expect(result.previousEndDate.getDate()).toBe(31);
    });

    it('should handle February 2024 vs January 2024 (leap year)', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 1, // February (0-indexed)
        selectedYear: 2024,
        comparisonMode: 'previous-month',
      });

      // Current period: February 2024 (29 days, leap year)
      expect(result.currentStartDate.getMonth()).toBe(1);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentEndDate.getMonth()).toBe(1);
      expect(result.currentEndDate.getDate()).toBe(29);

      // Comparison period: January 2024
      expect(result.previousStartDate.getMonth()).toBe(0);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousEndDate.getMonth()).toBe(0);
      expect(result.previousEndDate.getDate()).toBe(31);
    });
  });

  describe('Year-Over-Year Comparison', () => {
    it('should calculate May 2026 vs May 2025', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 4, // May (0-indexed)
        selectedYear: 2026,
        comparisonMode: 'previous-year',
      });

      // Current period: May 2026
      expect(result.currentStartDate.getMonth()).toBe(4);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentStartDate.getFullYear()).toBe(2026);

      expect(result.currentEndDate.getMonth()).toBe(4);
      expect(result.currentEndDate.getDate()).toBe(31);
      expect(result.currentEndDate.getFullYear()).toBe(2026);

      // Comparison period: May 2025
      expect(result.previousStartDate.getMonth()).toBe(4);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousStartDate.getFullYear()).toBe(2025);

      expect(result.previousEndDate.getMonth()).toBe(4);
      expect(result.previousEndDate.getDate()).toBe(31);
      expect(result.previousEndDate.getFullYear()).toBe(2025);
    });

    it('should calculate February 2024 vs February 2023 (leap year comparison)', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 1, // February (0-indexed)
        selectedYear: 2024,
        comparisonMode: 'previous-year',
      });

      // Current period: February 2024 (29 days, leap year)
      expect(result.currentStartDate.getMonth()).toBe(1);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentStartDate.getFullYear()).toBe(2024);
      expect(result.currentEndDate.getMonth()).toBe(1);
      expect(result.currentEndDate.getDate()).toBe(29);
      expect(result.currentEndDate.getFullYear()).toBe(2024);

      // Comparison period: February 2023 (28 days, non-leap year)
      expect(result.previousStartDate.getMonth()).toBe(1);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousStartDate.getFullYear()).toBe(2023);
      expect(result.previousEndDate.getMonth()).toBe(1);
      expect(result.previousEndDate.getDate()).toBe(28);
      expect(result.previousEndDate.getFullYear()).toBe(2023);
    });

    it('should calculate January 2026 vs January 2025', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 0, // January (0-indexed)
        selectedYear: 2026,
        comparisonMode: 'previous-year',
      });

      // Current period: January 2026
      expect(result.currentStartDate.getMonth()).toBe(0);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentStartDate.getFullYear()).toBe(2026);

      expect(result.currentEndDate.getMonth()).toBe(0);
      expect(result.currentEndDate.getDate()).toBe(31);
      expect(result.currentEndDate.getFullYear()).toBe(2026);

      // Comparison period: January 2025
      expect(result.previousStartDate.getMonth()).toBe(0);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousStartDate.getFullYear()).toBe(2025);

      expect(result.previousEndDate.getMonth()).toBe(0);
      expect(result.previousEndDate.getDate()).toBe(31);
      expect(result.previousEndDate.getFullYear()).toBe(2025);
    });

    it('should calculate December 2026 vs December 2025', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 11, // December (0-indexed)
        selectedYear: 2026,
        comparisonMode: 'previous-year',
      });

      // Current period: December 2026
      expect(result.currentStartDate.getMonth()).toBe(11);
      expect(result.currentStartDate.getDate()).toBe(1);
      expect(result.currentStartDate.getFullYear()).toBe(2026);

      expect(result.currentEndDate.getMonth()).toBe(11);
      expect(result.currentEndDate.getDate()).toBe(31);
      expect(result.currentEndDate.getFullYear()).toBe(2026);

      // Comparison period: December 2025
      expect(result.previousStartDate.getMonth()).toBe(11);
      expect(result.previousStartDate.getDate()).toBe(1);
      expect(result.previousStartDate.getFullYear()).toBe(2025);

      expect(result.previousEndDate.getMonth()).toBe(11);
      expect(result.previousEndDate.getDate()).toBe(31);
      expect(result.previousEndDate.getFullYear()).toBe(2025);
    });
  });

  describe('Date Range Boundaries', () => {
    it('should set correct end times for all date ranges', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 4, // May
        selectedYear: 2026,
        comparisonMode: 'previous-month',
      });

      // End dates should be at 23:59:59.999
      expect(result.currentEndDate.getHours()).toBe(23);
      expect(result.currentEndDate.getMinutes()).toBe(59);
      expect(result.currentEndDate.getSeconds()).toBe(59);
      expect(result.currentEndDate.getMilliseconds()).toBe(999);

      expect(result.previousEndDate.getHours()).toBe(23);
      expect(result.previousEndDate.getMinutes()).toBe(59);
      expect(result.previousEndDate.getSeconds()).toBe(59);
      expect(result.previousEndDate.getMilliseconds()).toBe(999);
    });

    it('should set correct start times for all date ranges', () => {
      const result = calculateMonthlyDateRanges({
        selectedMonth: 4, // May
        selectedYear: 2026,
        comparisonMode: 'previous-month',
      });

      // Start dates should be at 00:00:00.000
      expect(result.currentStartDate.getHours()).toBe(0);
      expect(result.currentStartDate.getMinutes()).toBe(0);
      expect(result.currentStartDate.getSeconds()).toBe(0);
      expect(result.currentStartDate.getMilliseconds()).toBe(0);

      expect(result.previousStartDate.getHours()).toBe(0);
      expect(result.previousStartDate.getMinutes()).toBe(0);
      expect(result.previousStartDate.getSeconds()).toBe(0);
      expect(result.previousStartDate.getMilliseconds()).toBe(0);
    });
  });

  describe('Month Days Accuracy', () => {
    it('should correctly handle 30-day months (April, June, September, November)', () => {
      const thirtyDayMonths = [3, 5, 8, 10]; // April, June, September, November

      for (const month of thirtyDayMonths) {
        const result = calculateMonthlyDateRanges({
          selectedMonth: month,
          selectedYear: 2026,
          comparisonMode: 'previous-month',
        });

        expect(result.currentEndDate.getDate()).toBe(30);
      }
    });

    it('should correctly handle 31-day months (January, March, May, July, August, October, December)', () => {
      const thirtyOneDayMonths = [0, 2, 4, 6, 7, 9, 11];

      for (const month of thirtyOneDayMonths) {
        const result = calculateMonthlyDateRanges({
          selectedMonth: month,
          selectedYear: 2026,
          comparisonMode: 'previous-month',
        });

        expect(result.currentEndDate.getDate()).toBe(31);
      }
    });
  });
});
