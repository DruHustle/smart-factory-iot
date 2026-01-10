/**
 * Export utilities for generating CSV and PDF files
 */

// CSV Export
export function exportToCSV<T extends object>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Determine columns from data or use provided columns
  const cols = columns || Object.keys(data[0]).map(key => ({ key: key as keyof T, label: key }));

  // Create CSV header
  const header = cols.map(col => `"${col.label}"`).join(",");

  // Create CSV rows
  const rows = data.map(row =>
    cols.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return `"${value.toISOString()}"`;
      return `"${String(value)}"`;
    }).join(",")
  );

  // Combine header and rows
  const csv = [header, ...rows].join("\n");

  // Download file
  downloadFile(csv, `${filename}.csv`, "text/csv;charset=utf-8;");
}

// PDF Export using browser print
export function exportToPDF(
  title: string,
  content: HTMLElement | string,
  filename: string
): void {
  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    console.error("Could not open print window");
    return;
  }

  const htmlContent = typeof content === "string" ? content : content.outerHTML;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          padding: 20px;
        }
        h1 {
          color: #0891b2;
          border-bottom: 2px solid #0891b2;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          color: #334155;
          margin-top: 30px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #e2e8f0;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f1f5f9;
          font-weight: 600;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .metric-card {
          display: inline-block;
          padding: 15px 25px;
          margin: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          text-align: center;
        }
        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: #0891b2;
        }
        .metric-label {
          font-size: 12px;
          color: #64748b;
        }
        .timestamp {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 30px;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${htmlContent}
      <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `);

  printWindow.document.close();
  
  // Add a print button for the user to trigger the PDF download
  const printBtn = printWindow.document.createElement("button");
  printBtn.innerHTML = "Download as PDF";
  printBtn.style.position = "fixed";
  printBtn.style.top = "20px";
  printBtn.style.right = "20px";
  printBtn.style.padding = "10px 20px";
  printBtn.style.backgroundColor = "#0891b2";
  printBtn.style.color = "white";
  printBtn.style.border = "none";
  printBtn.style.borderRadius = "5px";
  printBtn.style.cursor = "pointer";
  printBtn.style.fontWeight = "bold";
  printBtn.style.zIndex = "1000";
  printBtn.onclick = () => {
    printBtn.style.display = "none";
    printWindow.print();
    printBtn.style.display = "block";
  };
  printWindow.document.body.appendChild(printBtn);

  printWindow.document.close();
}

// Generate HTML table from data
export function generateHTMLTable<T extends object>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  if (data.length === 0) return "<p>No data available</p>";

  const headerRow = columns.map(col => `<th>${col.label}</th>`).join("");
  const bodyRows = data.map(row =>
    `<tr>${columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return "<td>-</td>";
      if (value instanceof Date) return `<td>${value.toLocaleDateString()}</td>`;
      return `<td>${String(value)}</td>`;
    }).join("")}</tr>`
  ).join("");

  return `
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `;
}

// Generate metrics summary HTML
export function generateMetricsSummary(
  metrics: { label: string; value: string | number; change?: string }[]
): string {
  return `
    <div style="margin: 20px 0;">
      ${metrics.map(m => `
        <div class="metric-card">
          <div class="metric-value">${m.value}</div>
          <div class="metric-label">${m.label}</div>
          ${m.change ? `<div style="color: ${m.change.startsWith('+') ? '#22c55e' : '#ef4444'}; font-size: 12px;">${m.change}</div>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

// Helper function to download file
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export shipments data
export interface ShipmentData {
  id: string;
  origin: string;
  destination: string;
  status: string;
  carrier: string;
  eta: string;
  weight: string;
  value: string;
}

export function exportShipmentsToCSV(shipments: ShipmentData[], filename = "shipments"): void {
  exportToCSV(shipments, filename, [
    { key: "id", label: "Shipment ID" },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
    { key: "status", label: "Status" },
    { key: "carrier", label: "Carrier" },
    { key: "eta", label: "ETA" },
    { key: "weight", label: "Weight" },
    { key: "value", label: "Value" },
  ]);
}

export function exportShipmentsToPDF(shipments: ShipmentData[], title = "Shipments Report"): void {
  const tableHTML = generateHTMLTable(shipments, [
    { key: "id", label: "Shipment ID" },
    { key: "origin", label: "Origin" },
    { key: "destination", label: "Destination" },
    { key: "status", label: "Status" },
    { key: "carrier", label: "Carrier" },
    { key: "eta", label: "ETA" },
  ]);

  const summaryHTML = generateMetricsSummary([
    { label: "Total Shipments", value: shipments.length },
    { label: "In Transit", value: shipments.filter(s => s.status === "In Transit").length },
    { label: "Delivered", value: shipments.filter(s => s.status === "Delivered").length },
    { label: "Pending", value: shipments.filter(s => s.status === "Pending").length },
  ]);

  exportToPDF(title, `<h2>Summary</h2>${summaryHTML}<h2>Shipment Details</h2>${tableHTML}`, "shipments-report");
}

// Export analytics data
export interface AnalyticsData {
  period: string;
  shipments: number;
  revenue: number;
  onTimeRate: number;
  avgDeliveryTime: number;
}

export function exportAnalyticsToCSV(data: AnalyticsData[], filename = "analytics"): void {
  exportToCSV(data, filename, [
    { key: "period", label: "Period" },
    { key: "shipments", label: "Total Shipments" },
    { key: "revenue", label: "Revenue ($)" },
    { key: "onTimeRate", label: "On-Time Rate (%)" },
    { key: "avgDeliveryTime", label: "Avg Delivery Time (days)" },
  ]);
}

export function exportAnalyticsToPDF(
  data: AnalyticsData[],
  summaryMetrics: { label: string; value: string | number; change?: string }[],
  title = "Analytics Report"
): void {
  const tableHTML = generateHTMLTable(data, [
    { key: "period", label: "Period" },
    { key: "shipments", label: "Shipments" },
    { key: "revenue", label: "Revenue" },
    { key: "onTimeRate", label: "On-Time %" },
    { key: "avgDeliveryTime", label: "Avg Days" },
  ]);

  const summaryHTML = generateMetricsSummary(summaryMetrics);

  exportToPDF(title, `<h2>Key Metrics</h2>${summaryHTML}<h2>Detailed Analytics</h2>${tableHTML}`, "analytics-report");
}
