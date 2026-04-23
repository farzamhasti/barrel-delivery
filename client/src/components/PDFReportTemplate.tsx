import React from "react";

export interface PDFMetrics {
  totalOrders: number;
  deliveredOrders: number;
  deliveryRate: number;
  averageDeliveryTime: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface PDFOrderTimeline {
  orderId: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  total: number;
  statuses: Array<{
    status: string;
    timestamp: string;
    durationMinutes?: number;
    durationSeconds?: number;
  }>;
}

export interface PDFDriverPerformance {
  driverId: number;
  driverName: string;
  totalDeliveries: number;
  completedDeliveries: number;
  averageDeliveryTime: number;
  completionRate: number;
}

interface PDFReportTemplateProps {
  metrics: PDFMetrics;
  orderTimelines: PDFOrderTimeline[];
  driverPerformance: PDFDriverPerformance[];
  reportType: "Daily" | "Weekly" | "Monthly";
}

/**
 * PDFReportTemplate component renders a professional PDF report layout
 * This component is designed to be rendered to HTML and then converted to PDF
 * using html2canvas and jsPDF
 * 
 * NOTE: Uses inline styles only to avoid OKLCH color parsing issues with html2canvas
 */
export const PDFReportTemplate = React.forwardRef<
  HTMLDivElement,
  PDFReportTemplateProps
>(({ metrics, orderTimelines, driverPerformance, reportType }, ref) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDuration = (minutes: number, seconds: number) => {
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        padding: "48px",
        color: "#000000",
        fontSize: "12px",
        lineHeight: "1.6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header with Logo */}
      <div
        style={{
          marginBottom: "32px",
          paddingBottom: "32px",
          borderBottom: "2px solid #d1d5db",
          display: "flex",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <img
          src="/manus-storage/logo_dceb0304.png"
          alt="The Barrel Restaurant (Pizza & Pasta)"
          style={{ height: "60px", width: "auto" }}
        />
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: "0 0 4px 0" }}>
            The Barrel Restaurant (Pizza & Pasta)
          </h1>
          <p style={{ fontSize: "14px", color: "#666666", margin: "0" }}>
            Delivery Management Report
          </p>
        </div>
      </div>

      {/* Report Info */}
      <div
        style={{
          marginBottom: "32px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        <div>
          <p style={{ fontSize: "11px", color: "#999999", margin: "0 0 4px 0" }}>
            Report Type
          </p>
          <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0" }}>
            {reportType} Report
          </p>
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "#999999", margin: "0 0 4px 0" }}>
            Date Range
          </p>
          <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0" }}>
            {metrics.dateRange.startDate} to {metrics.dateRange.endDate}
          </p>
        </div>
        <div>
          <p style={{ fontSize: "11px", color: "#999999", margin: "0 0 4px 0" }}>
            Generated
          </p>
          <p style={{ fontSize: "14px", fontWeight: "bold", margin: "0" }}>
            {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Metrics Summary */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
          Performance Summary
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              padding: "12px",
              borderRadius: "4px",
              backgroundColor: "#f3f4f6",
            }}
          >
            <p style={{ fontSize: "11px", color: "#666666", margin: "0 0 4px 0" }}>
              Total Orders
            </p>
            <p style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>
              {metrics.totalOrders}
            </p>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              padding: "12px",
              borderRadius: "4px",
              backgroundColor: "#f3f4f6",
            }}
          >
            <p style={{ fontSize: "11px", color: "#666666", margin: "0 0 4px 0" }}>
              Delivered
            </p>
            <p style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>
              {metrics.deliveredOrders}
            </p>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              padding: "12px",
              borderRadius: "4px",
              backgroundColor: "#f3f4f6",
            }}
          >
            <p style={{ fontSize: "11px", color: "#666666", margin: "0 0 4px 0" }}>
              Delivery Rate
            </p>
            <p style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>
              {metrics.deliveryRate.toFixed(1)}%
            </p>
          </div>
          <div
            style={{
              border: "1px solid #e5e7eb",
              padding: "12px",
              borderRadius: "4px",
              backgroundColor: "#f3f4f6",
            }}
          >
            <p style={{ fontSize: "11px", color: "#666666", margin: "0 0 4px 0" }}>
              Avg. Delivery Time
            </p>
            <p style={{ fontSize: "20px", fontWeight: "bold", margin: "0" }}>
              {metrics.averageDeliveryTime} min
            </p>
          </div>
        </div>
      </div>

      {/* Order Timeline Table */}
      {orderTimelines.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
            Order Timeline Details
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #333333" }}>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Order ID
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Customer
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Address
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Status Timeline
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    fontWeight: "bold",
                  }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {orderTimelines.map((order, idx) => (
                <tr
                  key={order.orderId}
                  style={{
                    borderBottom: "1px solid #dddddd",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9",
                  }}
                >
                  <td
                    style={{
                      padding: "8px",
                      borderRight: "1px solid #dddddd",
                      fontWeight: "bold",
                    }}
                  >
                    #{order.orderId}
                  </td>
                  <td style={{ padding: "8px", borderRight: "1px solid #dddddd" }}>
                    {order.customerName}
                  </td>
                  <td style={{ padding: "8px", borderRight: "1px solid #dddddd" }}>
                    {order.customerAddress}
                  </td>
                  <td style={{ padding: "8px", borderRight: "1px solid #dddddd" }}>
                    <div style={{ fontSize: "10px", lineHeight: "1.4" }}>
                      {order.statuses.map((s, i) => (
                        <div key={i}>
                          <span style={{ fontWeight: "bold" }}>{s.status}</span>
                          {s.durationMinutes !== undefined && s.durationSeconds !== undefined && (
                            <span style={{ color: "#666666" }}>
                              {" "}
                              ({formatDuration(s.durationMinutes, s.durationSeconds)})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold" }}>
                    {formatCurrency(order.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Driver Performance Table */}
      {driverPerformance.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "12px" }}>
            Driver Performance Breakdown
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f0f0f0", borderBottom: "2px solid #333333" }}>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Driver Name
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Total Deliveries
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Completed
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    fontWeight: "bold",
                    borderRight: "1px solid #dddddd",
                  }}
                >
                  Completion Rate
                </th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  Avg. Delivery Time
                </th>
              </tr>
            </thead>
            <tbody>
              {driverPerformance.map((driver, idx) => (
                <tr
                  key={driver.driverId}
                  style={{
                    borderBottom: "1px solid #dddddd",
                    backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f9f9f9",
                  }}
                >
                  <td style={{ padding: "8px", borderRight: "1px solid #dddddd" }}>
                    {driver.driverName}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      borderRight: "1px solid #dddddd",
                    }}
                  >
                    {driver.totalDeliveries}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      borderRight: "1px solid #dddddd",
                    }}
                  >
                    {driver.completedDeliveries}
                  </td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "center",
                      borderRight: "1px solid #dddddd",
                    }}
                  >
                    {driver.completionRate.toFixed(1)}%
                  </td>
                  <td style={{ padding: "8px", textAlign: "center" }}>
                    {driver.averageDeliveryTime} min
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "24px",
          paddingTop: "12px",
          borderTop: "1px solid #dddddd",
          fontSize: "10px",
          color: "#999999",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0" }}>
          This report was generated automatically by the Barrel Delivery Management System.
        </p>
        <p style={{ margin: "4px 0 0 0" }}>
          For questions or support, please contact the restaurant management.
        </p>
      </div>
    </div>
  );
});

PDFReportTemplate.displayName = "PDFReportTemplate";
