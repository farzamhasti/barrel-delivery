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
  let tempContainer: HTMLElement | null = null;
  
  try {
    // Clone the element to isolate it from page CSS
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Create a temporary container with reset styles to prevent CSS variable inheritance
    tempContainer = document.createElement("div");
    tempContainer.style.position = "fixed";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    tempContainer.style.width = "1200px";
    tempContainer.style.backgroundColor = "#ffffff";
    tempContainer.style.padding = "0";
    tempContainer.style.margin = "0";
    tempContainer.style.border = "none";
    tempContainer.style.color = "#000000";
    tempContainer.style.fontFamily = "Arial, sans-serif";
    
    // Reset all CSS variables to prevent OKLCH parsing issues by using RGB/hex colors
    const cssVars = [
      "--background",
      "--foreground",
      "--card",
      "--card-foreground",
      "--popover",
      "--popover-foreground",
      "--primary",
      "--primary-foreground",
      "--secondary",
      "--secondary-foreground",
      "--muted",
      "--muted-foreground",
      "--accent",
      "--accent-foreground",
      "--destructive",
      "--destructive-foreground",
      "--border",
      "--input",
      "--ring",
      "--chart-1",
      "--chart-2",
      "--chart-3",
      "--chart-4",
      "--chart-5",
      "--sidebar",
      "--sidebar-foreground",
      "--sidebar-primary",
      "--sidebar-primary-foreground",
      "--sidebar-accent",
      "--sidebar-accent-foreground",
      "--sidebar-border",
      "--sidebar-ring",
      "--orange",
      "--orange-light",
      "--green",
      "--red-light",
    ];
    
    // Map OKLCH colors to RGB equivalents
    const colorMap: Record<string, string> = {
      "--background": "#ffffff",
      "--foreground": "#333333",
      "--card": "#ffffff",
      "--card-foreground": "#333333",
      "--popover": "#ffffff",
      "--popover-foreground": "#333333",
      "--primary": "#0066cc",
      "--primary-foreground": "#ffffff",
      "--secondary": "#f0f0f0",
      "--secondary-foreground": "#666666",
      "--muted": "#f5f5f5",
      "--muted-foreground": "#999999",
      "--accent": "#ff9900",
      "--accent-foreground": "#ffffff",
      "--destructive": "#cc0000",
      "--destructive-foreground": "#ffffff",
      "--border": "#e5e5e5",
      "--input": "#f5f5f5",
      "--ring": "#ff9900",
      "--chart-1": "#ff9900",
      "--chart-2": "#0066cc",
      "--chart-3": "#0052a3",
      "--chart-4": "#003d7a",
      "--chart-5": "#002e5c",
      "--sidebar": "#ffffff",
      "--sidebar-foreground": "#333333",
      "--sidebar-primary": "#0052a3",
      "--sidebar-primary-foreground": "#ffffff",
      "--sidebar-accent": "#f0f0f0",
      "--sidebar-accent-foreground": "#ff9900",
      "--sidebar-border": "#e5e5e5",
      "--sidebar-ring": "#ff9900",
      "--orange": "#ff9900",
      "--orange-light": "#ffe6cc",
      "--green": "#00aa00",
      "--red-light": "#ffcccc",
    };
    
    // Apply RGB color overrides
    for (const [varName, rgbColor] of Object.entries(colorMap)) {
      tempContainer.style.setProperty(varName, rgbColor, "important");
    }
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);
    
    // Convert HTML to canvas with error handling
    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 10000,
      onclone: (clonedDoc) => {
        // Additional cleanup in the cloned document
        const style = clonedDoc.createElement("style");
        style.textContent = `
          * {
            color: #000000 !important;
            background-color: transparent !important;
            border-color: #cccccc !important;
          }
          body, div {
            background-color: #ffffff !important;
          }
        `;
        clonedDoc.head.appendChild(style);
      },
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
  } finally {
    // Clean up temporary container
    if (tempContainer && tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
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
