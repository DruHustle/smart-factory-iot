import { format } from "date-fns";

// PDF generation types
export interface DeviceReportData {
  device: {
    id: number;
    deviceId: string;
    name: string;
    type: string;
    status: string;
    zone: string | null;
    location: string | null;
    firmwareVersion: string | null;
    lastSeen: Date | null;
  };
  readings: {
    timestamp: number;
    temperature: number | null;
    humidity: number | null;
    vibration: number | null;
    power: number | null;
    rpm: number | null;
    pressure: number | null;
  }[];
  thresholds: {
    metric: string;
    minValue: number | null;
    maxValue: number | null;
    warningMin: number | null;
    warningMax: number | null;
    enabled: boolean;
  }[];
  alerts: {
    id: number;
    message: string;
    severity: string;
    status: string;
    createdAt: Date;
  }[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface AnalyticsReportData {
  overview: {
    totalDevices: number;
    onlineDevices: number;
    activeAlerts: number;
    criticalAlerts: number;
  };
  oeeMetrics: {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  };
  energyData: {
    timestamp: number;
    avgPower: number | null;
    avgTemperature: number | null;
    avgHumidity: number | null;
  }[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface AlertHistoryReportData {
  alerts: {
    id: number;
    deviceName: string;
    message: string;
    type: string;
    severity: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    resolved: number;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
}

// Generate HTML for PDF conversion
export function generateDeviceReportHtml(data: DeviceReportData): string {
  const { device, readings, thresholds, alerts, dateRange } = data;

  // Calculate statistics from readings
  const stats = calculateReadingStats(readings);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1a1a2e;
      font-size: 28px;
    }
    .header .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #3b82f6;
      font-size: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .info-item {
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
    }
    .info-item .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .info-item .value {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card .metric {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .stat-card .value {
      font-size: 24px;
      font-weight: 700;
      color: #3b82f6;
    }
    .stat-card .range {
      font-size: 11px;
      color: #94a3b8;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-online { background: #dcfce7; color: #166534; }
    .status-offline { background: #f1f5f9; color: #475569; }
    .status-critical { background: #fee2e2; color: #991b1b; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-info { background: #dbeafe; color: #1e40af; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Device Report: ${device.name}</h1>
    <div class="subtitle">
      Generated on ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")} | 
      Data from ${format(dateRange.start, "MMM d, yyyy")} to ${format(dateRange.end, "MMM d, yyyy")}
    </div>
  </div>

  <div class="section">
    <h2>Device Information</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="label">Device ID</div>
        <div class="value">${device.deviceId}</div>
      </div>
      <div class="info-item">
        <div class="label">Type</div>
        <div class="value">${device.type}</div>
      </div>
      <div class="info-item">
        <div class="label">Status</div>
        <div class="value"><span class="status-badge status-${device.status}">${device.status}</span></div>
      </div>
      <div class="info-item">
        <div class="label">Firmware</div>
        <div class="value">${device.firmwareVersion ?? "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="label">Zone</div>
        <div class="value">${device.zone ?? "N/A"}</div>
      </div>
      <div class="info-item">
        <div class="label">Location</div>
        <div class="value">${device.location ?? "N/A"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Sensor Statistics (${readings.length} readings)</h2>
    <div class="stats-grid">
      ${stats.temperature ? `
      <div class="stat-card">
        <div class="metric">Temperature</div>
        <div class="value">${stats.temperature.avg.toFixed(1)}°C</div>
        <div class="range">${stats.temperature.min.toFixed(1)} - ${stats.temperature.max.toFixed(1)}°C</div>
      </div>
      ` : ""}
      ${stats.humidity ? `
      <div class="stat-card">
        <div class="metric">Humidity</div>
        <div class="value">${stats.humidity.avg.toFixed(1)}%</div>
        <div class="range">${stats.humidity.min.toFixed(1)} - ${stats.humidity.max.toFixed(1)}%</div>
      </div>
      ` : ""}
      ${stats.power ? `
      <div class="stat-card">
        <div class="metric">Power</div>
        <div class="value">${stats.power.avg.toFixed(0)}W</div>
        <div class="range">${stats.power.min.toFixed(0)} - ${stats.power.max.toFixed(0)}W</div>
      </div>
      ` : ""}
      ${stats.vibration ? `
      <div class="stat-card">
        <div class="metric">Vibration</div>
        <div class="value">${stats.vibration.avg.toFixed(2)}</div>
        <div class="range">${stats.vibration.min.toFixed(2)} - ${stats.vibration.max.toFixed(2)}</div>
      </div>
      ` : ""}
      ${stats.rpm ? `
      <div class="stat-card">
        <div class="metric">RPM</div>
        <div class="value">${stats.rpm.avg.toFixed(0)}</div>
        <div class="range">${stats.rpm.min.toFixed(0)} - ${stats.rpm.max.toFixed(0)}</div>
      </div>
      ` : ""}
      ${stats.pressure ? `
      <div class="stat-card">
        <div class="metric">Pressure</div>
        <div class="value">${stats.pressure.avg.toFixed(2)} bar</div>
        <div class="range">${stats.pressure.min.toFixed(2)} - ${stats.pressure.max.toFixed(2)} bar</div>
      </div>
      ` : ""}
    </div>
  </div>

  ${thresholds.length > 0 ? `
  <div class="section">
    <h2>Alert Thresholds</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Critical Min</th>
          <th>Critical Max</th>
          <th>Warning Min</th>
          <th>Warning Max</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${thresholds.map(t => `
        <tr>
          <td>${t.metric}</td>
          <td>${t.minValue ?? "—"}</td>
          <td>${t.maxValue ?? "—"}</td>
          <td>${t.warningMin ?? "—"}</td>
          <td>${t.warningMax ?? "—"}</td>
          <td>${t.enabled ? "Enabled" : "Disabled"}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  ${alerts.length > 0 ? `
  <div class="section">
    <h2>Recent Alerts (${alerts.length})</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Severity</th>
          <th>Message</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${alerts.slice(0, 20).map(a => `
        <tr>
          <td>${format(new Date(a.createdAt), "MMM d, HH:mm")}</td>
          <td><span class="status-badge status-${a.severity}">${a.severity}</span></td>
          <td>${a.message}</td>
          <td>${a.status}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    Smart Factory IoT Dashboard | Device Report | Page 1 of 1
  </div>
</body>
</html>
  `;
}

export function generateAnalyticsReportHtml(data: AnalyticsReportData): string {
  const { overview, oeeMetrics, energyData, dateRange } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1a1a2e;
      font-size: 28px;
    }
    .header .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #3b82f6;
      font-size: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .kpi-card {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .kpi-card .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .kpi-card .value {
      font-size: 28px;
      font-weight: 700;
      color: #3b82f6;
    }
    .oee-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    .oee-card {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .oee-card .label {
      font-size: 12px;
      opacity: 0.8;
      text-transform: uppercase;
    }
    .oee-card .value {
      font-size: 32px;
      font-weight: 700;
    }
    .oee-card.highlight {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Analytics Report</h1>
    <div class="subtitle">
      Generated on ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")} | 
      Data from ${format(dateRange.start, "MMM d, yyyy")} to ${format(dateRange.end, "MMM d, yyyy")}
    </div>
  </div>

  <div class="section">
    <h2>System Overview</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="label">Total Devices</div>
        <div class="value">${overview.totalDevices}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Online</div>
        <div class="value" style="color: #10b981;">${overview.onlineDevices}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Active Alerts</div>
        <div class="value" style="color: #f59e0b;">${overview.activeAlerts}</div>
      </div>
      <div class="kpi-card">
        <div class="label">Critical</div>
        <div class="value" style="color: #ef4444;">${overview.criticalAlerts}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>OEE Metrics</h2>
    <div class="oee-grid">
      <div class="oee-card">
        <div class="label">Availability</div>
        <div class="value">${oeeMetrics.availability}%</div>
      </div>
      <div class="oee-card">
        <div class="label">Performance</div>
        <div class="value">${oeeMetrics.performance}%</div>
      </div>
      <div class="oee-card">
        <div class="label">Quality</div>
        <div class="value">${oeeMetrics.quality}%</div>
      </div>
      <div class="oee-card highlight">
        <div class="label">Overall OEE</div>
        <div class="value">${oeeMetrics.oee}%</div>
      </div>
    </div>
  </div>

  ${energyData.length > 0 ? `
  <div class="section">
    <h2>Energy & Environmental Data</h2>
    <table>
      <thead>
        <tr>
          <th>Time Period</th>
          <th>Avg Power (W)</th>
          <th>Avg Temp (°C)</th>
          <th>Avg Humidity (%)</th>
        </tr>
      </thead>
      <tbody>
        ${energyData.slice(0, 20).map(d => `
        <tr>
          <td>${format(new Date(d.timestamp), "MMM d, HH:mm")}</td>
          <td>${d.avgPower?.toFixed(0) ?? "—"}</td>
          <td>${d.avgTemperature?.toFixed(1) ?? "—"}</td>
          <td>${d.avgHumidity?.toFixed(1) ?? "—"}</td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  ` : ""}

  <div class="footer">
    Smart Factory IoT Dashboard | Analytics Report | Page 1 of 1
  </div>
</body>
</html>
  `;
}

export function generateAlertHistoryReportHtml(data: AlertHistoryReportData): string {
  const { alerts, summary, dateRange } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a2e;
      line-height: 1.6;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #f59e0b;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      color: #1a1a2e;
      font-size: 28px;
    }
    .header .subtitle {
      color: #64748b;
      font-size: 14px;
      margin-top: 5px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      color: #f59e0b;
      font-size: 18px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 15px;
    }
    .summary-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: 700;
    }
    .summary-card.critical .value { color: #ef4444; }
    .summary-card.warning .value { color: #f59e0b; }
    .summary-card.info .value { color: #3b82f6; }
    .summary-card.resolved .value { color: #10b981; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      color: #64748b;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 6px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
    }
    .status-critical { background: #fee2e2; color: #991b1b; }
    .status-warning { background: #fef3c7; color: #92400e; }
    .status-info { background: #dbeafe; color: #1e40af; }
    .status-active { background: #fee2e2; color: #991b1b; }
    .status-acknowledged { background: #fef3c7; color: #92400e; }
    .status-resolved { background: #dcfce7; color: #166534; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Alert History Report</h1>
    <div class="subtitle">
      Generated on ${format(new Date(), "MMMM d, yyyy 'at' HH:mm")} | 
      Data from ${format(dateRange.start, "MMM d, yyyy")} to ${format(dateRange.end, "MMM d, yyyy")}
    </div>
  </div>

  <div class="section">
    <h2>Summary</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Total</div>
        <div class="value">${summary.total}</div>
      </div>
      <div class="summary-card critical">
        <div class="label">Critical</div>
        <div class="value">${summary.critical}</div>
      </div>
      <div class="summary-card warning">
        <div class="label">Warning</div>
        <div class="value">${summary.warning}</div>
      </div>
      <div class="summary-card info">
        <div class="label">Info</div>
        <div class="value">${summary.info}</div>
      </div>
      <div class="summary-card resolved">
        <div class="label">Resolved</div>
        <div class="value">${summary.resolved}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Alert Details (${alerts.length} alerts)</h2>
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Device</th>
          <th>Severity</th>
          <th>Type</th>
          <th>Message</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${alerts.map(a => `
        <tr>
          <td>${format(new Date(a.createdAt), "MMM d, HH:mm")}</td>
          <td>${a.deviceName}</td>
          <td><span class="status-badge status-${a.severity}">${a.severity}</span></td>
          <td>${a.type.replace(/_/g, " ")}</td>
          <td>${a.message}</td>
          <td><span class="status-badge status-${a.status}">${a.status}</span></td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <div class="footer">
    Smart Factory IoT Dashboard | Alert History Report | Page 1 of 1
  </div>
</body>
</html>
  `;
}

// Helper function to calculate statistics from readings
function calculateReadingStats(readings: DeviceReportData["readings"]) {
  const stats: Record<string, { min: number; max: number; avg: number; count: number } | null> = {
    temperature: null,
    humidity: null,
    vibration: null,
    power: null,
    rpm: null,
    pressure: null,
  };

  const metrics = ["temperature", "humidity", "vibration", "power", "rpm", "pressure"] as const;

  for (const metric of metrics) {
    const values = readings
      .map((r) => r[metric])
      .filter((v): v is number => v !== null && v !== undefined);

    if (values.length > 0) {
      stats[metric] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
      };
    }
  }

  return stats;
}
