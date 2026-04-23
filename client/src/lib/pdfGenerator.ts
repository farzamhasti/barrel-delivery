import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PDFMetrics, PDFOrderTimeline, PDFDriverPerformance } from "@/components/PDFReportTemplate";

/**
 * Generates a PDF report from an HTML element
 * @param element - The HTML element to convert to PDF
 * @param filename - The filename for the downloaded PDF
 * @param reportType - Type of report (Daily, Weekly, Monthly)
 * @param dateRange - Date range for the report
 */
export async function generatePDFReport(
  element: HTMLElement,
  filename: string,
  reportType: "Daily" | "Weekly" | "Monthly",
  dateRange: { startDate: string; endDate: string }
): Promise<void> {
  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
    });

    // Get canvas dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF
    const pdf = new jsPDF("p", "mm", "a4");
    let heightLeft = imgHeight;
    let position = 0;

    // Add image to PDF, handling multiple pages if needed
    const imgData = canvas.toDataURL("image/png");
    while (heightLeft >= 0) {
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      if (heightLeft >= 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
      }
    }

    // Generate filename with date
    const timestamp = new Date().toISOString().split("T")[0];
    const finalFilename = `${filename}-${reportType}-${timestamp}.pdf`;

    // Download PDF
    pdf.save(finalFilename);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF report");
  }
}

/**
 * Validates PDF report data
 */
export function validatePDFData(
  metrics: PDFMetrics,
  orderTimelines: PDFOrderTimeline[],
  driverPerformance: PDFDriverPerformance[]
): boolean {
  // Validate metrics
  if (!metrics || typeof metrics.totalOrders !== "number") {
    console.error("Invalid metrics data");
    return false;
  }

  // Validate order timelines
  if (!Array.isArray(orderTimelines)) {
    console.error("Invalid order timelines data");
    return false;
  }

  // Validate driver performance
  if (!Array.isArray(driverPerformance)) {
    console.error("Invalid driver performance data");
    return false;
  }

  return true;
}

/**
 * Formats metrics for PDF display
 */
export function formatMetricsForPDF(metrics: any): PDFMetrics {
  return {
    totalOrders: metrics.totalOrders || 0,
    deliveredOrders: metrics.deliveredOrders || 0,
    deliveryRate: metrics.deliveryRate || 0,
    averageDeliveryTime: metrics.averageDeliveryTime || 0,
    dateRange: metrics.dateRange || { startDate: "", endDate: "" },
  };
}

/**
 * Formats order timelines for PDF display
 */
export function formatOrderTimelinesForPDF(orders: any[]): PDFOrderTimeline[] {
  return orders.map((order) => ({
    orderId: order.orderId || 0,
    customerName: order.customerName || "N/A",
    customerAddress: order.customerAddress || "N/A",
    customerPhone: order.customerPhone || "N/A",
    total: order.total || 0,
    statuses: order.statuses || [],
  }));
}

/**
 * Formats driver performance for PDF display
 */
export function formatDriverPerformanceForPDF(drivers: any[]): PDFDriverPerformance[] {
  return drivers.map((driver) => ({
    driverId: driver.driverId || 0,
    driverName: driver.driverName || "N/A",
    totalDeliveries: driver.totalDeliveries || 0,
    completedDeliveries: driver.completedDeliveries || 0,
    averageDeliveryTime: driver.averageDeliveryTime || 0,
    completionRate: driver.completionRate || 0,
  }));
}
