import jsPDF from "jspdf";
import { PDFMetrics, PDFOrderTimeline, PDFDriverPerformance } from "@/components/PDFReportTemplate";

/**
 * Generates a PDF report directly using jsPDF without html2canvas
 * This avoids canvas taint issues with external images
 */
export async function generatePDFReport(
  element: HTMLElement,
  filename: string,
  reportType: "Daily" | "Weekly" | "Monthly",
  dateRange: { startDate: string; endDate: string }
): Promise<void> {
  try {
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Set default font
    pdf.setFont("Arial", "normal");
    pdf.setFontSize(12);

    // Title
    pdf.setFontSize(24);
    pdf.setFont("Arial", "bold");
    pdf.text("The Barrel Restaurant (Pizza & Pasta)", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(14);
    pdf.setFont("Arial", "normal");
    pdf.text("Delivery Management Report", 20, yPosition);
    yPosition += 15;

    // Report Info Section
    pdf.setFontSize(11);
    pdf.setFont("Arial", "bold");
    pdf.text("Report Information", 20, yPosition);
    yPosition += 7;

    pdf.setFont("Arial", "normal");
    pdf.setFontSize(10);
    pdf.text(`Report Type: ${reportType} Report`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 12;

    // Extract metrics from the element
    const metricsData = extractMetricsFromElement(element);
    const ordersData = extractOrdersFromElement(element);
    const driversData = extractDriversFromElement(element);

    // Metrics Summary Section
    if (metricsData) {
      pdf.setFontSize(12);
      pdf.setFont("Arial", "bold");
      pdf.text("Performance Summary", 20, yPosition);
      yPosition += 8;

      pdf.setFont("Arial", "normal");
      pdf.setFontSize(10);

      const metrics = [
        [`Total Orders: ${metricsData.totalOrders}`, `Delivered: ${metricsData.deliveredOrders}`],
        [`Delivery Rate: ${metricsData.deliveryRate.toFixed(1)}%`, `Avg. Time: ${metricsData.averageDeliveryTime} min`],
      ];

      for (const row of metrics) {
        pdf.text(row[0], 20, yPosition);
        pdf.text(row[1], 110, yPosition);
        yPosition += 6;
      }
      yPosition += 6;
    }

    // Order Timeline Table
    if (ordersData && ordersData.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont("Arial", "bold");
      pdf.text("Order Timeline Details", 20, yPosition);
      yPosition += 8;

      pdf.setFont("Arial", "normal");
      pdf.setFontSize(9);

      // Table headers
      const headers = ["Order ID", "Customer", "Address", "Status", "Total"];
      const colWidths = [18, 35, 40, 50, 22];
      let xPos = 20;

      pdf.setFont("Arial", "bold");
      pdf.setFillColor(240, 240, 240);
      for (let i = 0; i < headers.length; i++) {
        pdf.rect(xPos, yPosition - 5, colWidths[i], 6, "F");
        pdf.text(headers[i], xPos + 1, yPosition);
        xPos += colWidths[i];
      }
      yPosition += 8;

      // Table rows
      pdf.setFont("Arial", "normal");
      for (const order of ordersData.slice(0, 10)) {
        // Limit to 10 orders per page
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        xPos = 20;
        const statusText = order.statuses.map((s: any) => s.status).join(" → ");

        // Order ID
        pdf.text(`#${order.orderId}`, xPos + 1, yPosition);
        xPos += colWidths[0];

        // Customer
        pdf.text(order.customerName.substring(0, 15), xPos + 1, yPosition);
        xPos += colWidths[1];

        // Address
        pdf.text(order.customerAddress.substring(0, 20), xPos + 1, yPosition);
        xPos += colWidths[2];

        // Status
        pdf.text(statusText.substring(0, 25), xPos + 1, yPosition);
        xPos += colWidths[3];

        // Total
        pdf.text(`$${order.total.toFixed(2)}`, xPos + 1, yPosition);

        yPosition += 6;
      }
      yPosition += 8;
    }

    // Driver Performance Table
    if (driversData && driversData.length > 0) {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont("Arial", "bold");
      pdf.text("Driver Performance Breakdown", 20, yPosition);
      yPosition += 8;

      pdf.setFont("Arial", "normal");
      pdf.setFontSize(9);

      // Table headers
      const headers = ["Driver Name", "Total", "Completed", "Rate %", "Avg. Time"];
      const colWidths = [50, 20, 25, 25, 30];
      let xPos = 20;

      pdf.setFont("Arial", "bold");
      pdf.setFillColor(240, 240, 240);
      for (let i = 0; i < headers.length; i++) {
        pdf.rect(xPos, yPosition - 5, colWidths[i], 6, "F");
        pdf.text(headers[i], xPos + 1, yPosition);
        xPos += colWidths[i];
      }
      yPosition += 8;

      // Table rows
      pdf.setFont("Arial", "normal");
      for (const driver of driversData) {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        xPos = 20;

        // Driver Name
        pdf.text(driver.driverName.substring(0, 20), xPos + 1, yPosition);
        xPos += colWidths[0];

        // Total Deliveries
        pdf.text(driver.totalDeliveries.toString(), xPos + 1, yPosition);
        xPos += colWidths[1];

        // Completed
        pdf.text(driver.completedDeliveries.toString(), xPos + 1, yPosition);
        xPos += colWidths[2];

        // Completion Rate
        pdf.text(`${driver.completionRate.toFixed(1)}%`, xPos + 1, yPosition);
        xPos += colWidths[3];

        // Avg. Delivery Time
        pdf.text(`${driver.averageDeliveryTime} min`, xPos + 1, yPosition);

        yPosition += 6;
      }
    }

    // Footer
    yPosition = pageHeight - 15;
    pdf.setFontSize(8);
    pdf.setFont("Arial", "normal");
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      "This report was generated automatically by the Barrel Delivery Management System.",
      20,
      yPosition
    );

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
 * Extract metrics data from the rendered element
 */
function extractMetricsFromElement(element: HTMLElement): any {
  try {
    // Look for metric values in the element
    const text = element.innerText;
    const totalOrdersMatch = text.match(/Total Orders[:\s]+(\d+)/i);
    const deliveredMatch = text.match(/Delivered[:\s]+(\d+)/i);
    const rateMatch = text.match(/Delivery Rate[:\s]+([\d.]+)%/i);
    const timeMatch = text.match(/Avg\.\s*Delivery Time[:\s]+(\d+)\s*min/i);

    return {
      totalOrders: totalOrdersMatch ? parseInt(totalOrdersMatch[1]) : 0,
      deliveredOrders: deliveredMatch ? parseInt(deliveredMatch[1]) : 0,
      deliveryRate: rateMatch ? parseFloat(rateMatch[1]) : 0,
      averageDeliveryTime: timeMatch ? parseInt(timeMatch[1]) : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Extract order data from the rendered element
 */
function extractOrdersFromElement(element: HTMLElement): any[] {
  try {
    const orders: any[] = [];
    const tables = element.querySelectorAll("table");

    if (tables.length > 0) {
      const rows = tables[0].querySelectorAll("tbody tr");
      for (const row of Array.from(rows)) {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 5) {
          orders.push({
            orderId: parseInt(cells[0].innerText.replace("#", "")) || 0,
            customerName: cells[1].innerText || "N/A",
            customerAddress: cells[2].innerText || "N/A",
            statuses: [{ status: cells[3].innerText || "N/A" }],
            total: parseFloat(cells[4].innerText.replace("$", "")) || 0,
          });
        }
      }
    }

    return orders;
  } catch {
    return [];
  }
}

/**
 * Extract driver data from the rendered element
 */
function extractDriversFromElement(element: HTMLElement): any[] {
  try {
    const drivers: any[] = [];
    const tables = element.querySelectorAll("table");

    if (tables.length > 1) {
      const rows = tables[1].querySelectorAll("tbody tr");
      for (const row of Array.from(rows)) {
        const cells = row.querySelectorAll("td");
        if (cells.length >= 5) {
          drivers.push({
            driverName: cells[0].innerText || "N/A",
            totalDeliveries: parseInt(cells[1].innerText) || 0,
            completedDeliveries: parseInt(cells[2].innerText) || 0,
            completionRate: parseFloat(cells[3].innerText.replace("%", "")) || 0,
            averageDeliveryTime: parseInt(cells[4].innerText.replace(/\D/g, "")) || 0,
          });
        }
      }
    }

    return drivers;
  } catch {
    return [];
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
    orderNumber: order.orderNumber || "N/A",
    customerAddress: order.customerAddress || null,
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
