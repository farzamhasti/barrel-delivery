import { describe, it, expect, vi } from "vitest";
import {
  formatMetricsForPDF,
  formatOrderTimelinesForPDF,
  formatDriverPerformanceForPDF,
  validatePDFData,
} from "../client/src/lib/pdfGenerator";
import { PDFMetrics, PDFOrderTimeline, PDFDriverPerformance } from "../client/src/components/PDFReportTemplate";

describe("PDF Generation Utilities", () => {
  describe("formatMetricsForPDF", () => {
    it("should format valid metrics correctly", () => {
      const input = {
        totalOrders: 10,
        deliveredOrders: 8,
        deliveryRate: 80,
        averageDeliveryTime: 15,
        dateRange: { startDate: "2026-04-01", endDate: "2026-04-30" },
      };

      const result = formatMetricsForPDF(input);

      expect(result.totalOrders).toBe(10);
      expect(result.deliveredOrders).toBe(8);
      expect(result.deliveryRate).toBe(80);
      expect(result.averageDeliveryTime).toBe(15);
    });

    it("should handle missing metrics with defaults", () => {
      const input = {};

      const result = formatMetricsForPDF(input);

      expect(result.totalOrders).toBe(0);
      expect(result.deliveredOrders).toBe(0);
      expect(result.deliveryRate).toBe(0);
      expect(result.averageDeliveryTime).toBe(0);
    });
  });

  describe("formatOrderTimelinesForPDF", () => {
    it("should format valid order timelines", () => {
      const input = [
        {
          orderId: 1,
          customerName: "John Doe",
          customerAddress: "123 Main St",
          customerPhone: "555-1234",
          total: 45.99,
          statuses: [
            { status: "Pending", timestamp: "2026-04-23 10:00:00" },
            { status: "Ready", timestamp: "2026-04-23 10:15:00" },
          ],
        },
      ];

      const result = formatOrderTimelinesForPDF(input);

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe(1);
      expect(result[0].customerName).toBe("John Doe");
      expect(result[0].total).toBe(45.99);
    });

    it("should handle empty array", () => {
      const input: any[] = [];

      const result = formatOrderTimelinesForPDF(input);

      expect(result).toEqual([]);
    });

    it("should provide default values for missing fields", () => {
      const input = [
        {
          orderId: 1,
          customerName: "Jane Smith",
        },
      ];

      const result = formatOrderTimelinesForPDF(input);

      expect(result[0].orderId).toBe(1);
      expect(result[0].customerName).toBe("Jane Smith");
      expect(result[0].customerAddress).toBe("N/A");
      expect(result[0].customerPhone).toBe("N/A");
      expect(result[0].total).toBe(0);
    });
  });

  describe("formatDriverPerformanceForPDF", () => {
    it("should format valid driver performance data", () => {
      const input = [
        {
          driverId: 1,
          driverName: "Bob Smith",
          totalDeliveries: 20,
          completedDeliveries: 18,
          averageDeliveryTime: 15,
          completionRate: 90,
        },
      ];

      const result = formatDriverPerformanceForPDF(input);

      expect(result).toHaveLength(1);
      expect(result[0].driverId).toBe(1);
      expect(result[0].driverName).toBe("Bob Smith");
      expect(result[0].totalDeliveries).toBe(20);
      expect(result[0].completionRate).toBe(90);
    });

    it("should handle empty array", () => {
      const input: any[] = [];

      const result = formatDriverPerformanceForPDF(input);

      expect(result).toEqual([]);
    });

    it("should provide default values for missing fields", () => {
      const input = [
        {
          driverId: 2,
          driverName: "Charlie Brown",
        },
      ];

      const result = formatDriverPerformanceForPDF(input);

      expect(result[0].driverId).toBe(2);
      expect(result[0].driverName).toBe("Charlie Brown");
      expect(result[0].totalDeliveries).toBe(0);
      expect(result[0].completedDeliveries).toBe(0);
    });

    it("should handle multiple drivers", () => {
      const input: PDFDriverPerformance[] = [
        {
          driverId: 1,
          driverName: "Driver One",
          totalDeliveries: 10,
          completedDeliveries: 10,
          averageDeliveryTime: 12,
          completionRate: 100,
        },
        {
          driverId: 2,
          driverName: "Driver Two",
          totalDeliveries: 15,
          completedDeliveries: 12,
          averageDeliveryTime: 18,
          completionRate: 80,
        },
      ];

      const result = formatDriverPerformanceForPDF(input);

      expect(result).toHaveLength(2);
      expect(result[0].completionRate).toBe(100);
      expect(result[1].completionRate).toBe(80);
    });
  });

  describe("validatePDFData", () => {
    it("should validate correct data", () => {
      const metrics: PDFMetrics = {
        totalOrders: 10,
        deliveredOrders: 8,
        deliveryRate: 80,
        averageDeliveryTime: 15,
        dateRange: { startDate: "2026-04-01", endDate: "2026-04-30" },
      };
      const orderTimelines: PDFOrderTimeline[] = [];
      const driverPerformance: PDFDriverPerformance[] = [];

      const result = validatePDFData(metrics, orderTimelines, driverPerformance);

      expect(result).toBe(true);
    });

    it("should reject invalid metrics", () => {
      const metrics = null;
      const orderTimelines: PDFOrderTimeline[] = [];
      const driverPerformance: PDFDriverPerformance[] = [];

      const result = validatePDFData(metrics, orderTimelines, driverPerformance);

      expect(result).toBe(false);
    });

    it("should reject non-array order timelines", () => {
      const metrics: PDFMetrics = {
        totalOrders: 10,
        deliveredOrders: 8,
        deliveryRate: 80,
        averageDeliveryTime: 15,
        dateRange: { startDate: "2026-04-01", endDate: "2026-04-30" },
      };
      const orderTimelines = null;
      const driverPerformance: PDFDriverPerformance[] = [];

      const result = validatePDFData(metrics, orderTimelines, driverPerformance);

      expect(result).toBe(false);
    });

    it("should reject non-array driver performance", () => {
      const metrics: PDFMetrics = {
        totalOrders: 10,
        deliveredOrders: 8,
        deliveryRate: 80,
        averageDeliveryTime: 15,
        dateRange: { startDate: "2026-04-01", endDate: "2026-04-30" },
      };
      const orderTimelines: PDFOrderTimeline[] = [];
      const driverPerformance = null;

      const result = validatePDFData(metrics, orderTimelines, driverPerformance);

      expect(result).toBe(false);
    });

    it("should validate with populated arrays", () => {
      const metrics: PDFMetrics = {
        totalOrders: 10,
        deliveredOrders: 8,
        deliveryRate: 80,
        averageDeliveryTime: 15,
        dateRange: { startDate: "2026-04-01", endDate: "2026-04-30" },
      };
      const orderTimelines: PDFOrderTimeline[] = [
        {
          orderId: 1,
          customerName: "Test",
          customerAddress: "123 St",
          customerPhone: "555-1234",
          total: 50,
          statuses: [],
        },
      ];
      const driverPerformance: PDFDriverPerformance[] = [
        {
          driverId: 1,
          driverName: "Driver",
          totalDeliveries: 10,
          completedDeliveries: 8,
          averageDeliveryTime: 15,
          completionRate: 80,
        },
      ];

      const result = validatePDFData(metrics, orderTimelines, driverPerformance);

      expect(result).toBe(true);
    });
  });

  describe("PDF Data Formatting Integration", () => {
    it("should format complete report data correctly", () => {
      const rawMetrics = {
        totalOrders: 50,
        deliveredOrders: 45,
        deliveryRate: 90,
        averageDeliveryTime: 16,
        dateRange: { startDate: "2026-04-01", endDate: "2026-04-30" },
      };

      const rawOrders = [
        {
          orderId: 1,
          customerName: "Customer 1",
          customerAddress: "Address 1",
          customerPhone: "555-0001",
          total: 45.99,
          statuses: [{ status: "Delivered", timestamp: "10:00:00" }],
        },
        {
          orderId: 2,
          customerName: "Customer 2",
          customerAddress: "Address 2",
          total: 32.50,
        },
      ];

      const rawDrivers = [
        {
          driverId: 1,
          driverName: "John",
          totalDeliveries: 25,
          completedDeliveries: 24,
          averageDeliveryTime: 14,
          completionRate: 96,
        },
      ];

      const formattedMetrics = formatMetricsForPDF(rawMetrics);
      const formattedOrders = formatOrderTimelinesForPDF(rawOrders);
      const formattedDrivers = formatDriverPerformanceForPDF(rawDrivers);

      expect(validatePDFData(formattedMetrics, formattedOrders, formattedDrivers)).toBe(true);
      expect(formattedMetrics.totalOrders).toBe(50);
      expect(formattedOrders).toHaveLength(2);
      expect(formattedDrivers).toHaveLength(1);
    });

    it("should handle edge case with zero metrics", () => {
      const metrics = formatMetricsForPDF({
        totalOrders: 0,
        deliveredOrders: 0,
        deliveryRate: 0,
        averageDeliveryTime: 0,
      });

      expect(metrics.totalOrders).toBe(0);
      expect(metrics.deliveryRate).toBe(0);
      expect(validatePDFData(metrics, [], [])).toBe(true);
    });

    it("should handle edge case with high metrics", () => {
      const metrics = formatMetricsForPDF({
        totalOrders: 10000,
        deliveredOrders: 9999,
        deliveryRate: 99.99,
        averageDeliveryTime: 120,
      });

      expect(metrics.totalOrders).toBe(10000);
      expect(metrics.deliveryRate).toBe(99.99);
      expect(validatePDFData(metrics, [], [])).toBe(true);
    });
  });
});
