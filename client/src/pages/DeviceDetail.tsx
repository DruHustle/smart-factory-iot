import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Thermometer,
  Droplets,
  Activity,
  Zap,
  Gauge,
  CalendarIcon,
  RefreshCw,
  Settings,
  Download,
  FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { format, subHours, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import ThresholdConfigDialog from "@/components/ThresholdConfigDialog";
import { ExportButton } from "@/components/ExportButton";
import { toast } from "sonner";

type DeviceStatus = "online" | "offline" | "maintenance" | "error";

const statusColors: Record<DeviceStatus, string> = {
  online: "bg-success text-success-foreground",
  offline: "bg-muted text-muted-foreground",
  maintenance: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
};

const metricColors = {
  temperature: "#f97316",
  humidity: "#3b82f6",
  vibration: "#8b5cf6",
  power: "#eab308",
  rpm: "#10b981",
  pressure: "#ec4899",
};

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d" | "custom";

export default function DeviceDetail() {
  const params = useParams<{ id: string }>();
  const deviceId = parseInt(params.id ?? "0");
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "temperature",
    "humidity",
    "power",
  ]);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);

  const { startTime, endTime } = useMemo(() => {
    const now = Date.now();
    if (timeRange === "custom" && customDateRange.from && customDateRange.to) {
      return {
        startTime: customDateRange.from.getTime(),
        endTime: customDateRange.to.getTime(),
      };
    }
    const ranges: Record<TimeRange, number> = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      custom: 24 * 60 * 60 * 1000,
    };
    return { startTime: now - ranges[timeRange], endTime: now };
  }, [timeRange, customDateRange]);

  const { data: device, isLoading: deviceLoading } = trpc.devices.getById.useQuery({
    id: deviceId,
  });

  const { data: readings, isLoading: readingsLoading, refetch } = trpc.readings.getForDevice.useQuery(
    { deviceId, startTime, endTime },
    { enabled: !!device }
  );

  const { data: thresholds } = trpc.thresholds.getForDevice.useQuery(
    { deviceId },
    { enabled: !!device }
  );

  const { data: latestReading } = trpc.readings.getLatest.useQuery(
    { deviceId },
    { enabled: !!device, refetchInterval: 10000 }
  );

  const chartData = useMemo(() => {
    if (!readings) return [];
    return readings.map((r) => ({
      timestamp: r.timestamp,
      time: format(new Date(r.timestamp), "HH:mm"),
      date: format(new Date(r.timestamp), "MMM dd"),
      temperature: r.temperature,
      humidity: r.humidity,
      vibration: r.vibration,
      power: r.power,
      rpm: r.rpm,
      pressure: r.pressure,
    }));
  }, [readings]);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric)
        ? prev.filter((m) => m !== metric)
        : [...prev, metric]
    );
  };

  const exportMutation = trpc.export.deviceReport.useMutation();

  const handleExport = async () => {
    const result = await exportMutation.mutateAsync({
      deviceId,
      startTime,
      endTime,
    });
    return result;
  };

  if (deviceLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Device not found</h2>
        <Button variant="outline" onClick={() => setLocation("/devices")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Devices
        </Button>
      </div>
    );
  }

  const status = device.status as DeviceStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/devices")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{device.name}</h1>
              <Badge className={statusColors[status]}>{status}</Badge>
            </div>
            <p className="text-muted-foreground">
              {device.deviceId} • {device.zone ?? "No zone"} • {device.location ?? "No location"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setThresholdDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Thresholds
          </Button>
          <ExportButton onExportHtml={handleExport} label="Export Report" />
        </div>
      </div>

      {/* Current Readings */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {latestReading?.temperature !== null && latestReading?.temperature !== undefined && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-2/10">
                  <Thermometer className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestReading.temperature.toFixed(1)}°C</p>
                  <p className="text-xs text-muted-foreground">Temperature</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {latestReading?.humidity !== null && latestReading?.humidity !== undefined && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-1/10">
                  <Droplets className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestReading.humidity.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Humidity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {latestReading?.power !== null && latestReading?.power !== undefined && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-5/10">
                  <Zap className="h-5 w-5 text-chart-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestReading.power.toFixed(0)}W</p>
                  <p className="text-xs text-muted-foreground">Power</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {latestReading?.vibration !== null && latestReading?.vibration !== undefined && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-4/10">
                  <Activity className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{latestReading.vibration.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Vibration (mm/s)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Historical Data */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Historical Data</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last 1 hour</SelectItem>
                  <SelectItem value="6h">Last 6 hours</SelectItem>
                  <SelectItem value="24h">Last 24 hours</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              {timeRange === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-auto">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {customDateRange.from && customDateRange.to
                        ? `${format(customDateRange.from, "MMM dd")} - ${format(customDateRange.to, "MMM dd")}`
                        : "Pick dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      selected={{
                        from: customDateRange.from,
                        to: customDateRange.to,
                      }}
                      onSelect={(range) =>
                        setCustomDateRange({ from: range?.from, to: range?.to })
                      }
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}

              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className={`h-4 w-4 ${readingsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Metric Toggles */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(metricColors).map(([metric, color]) => (
              <Button
                key={metric}
                variant={selectedMetrics.includes(metric) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleMetric(metric)}
                style={{
                  backgroundColor: selectedMetrics.includes(metric) ? color : undefined,
                  borderColor: color,
                }}
              >
                {metric.charAt(0).toUpperCase() + metric.slice(1)}
              </Button>
            ))}
          </div>

          {/* Chart */}
          {readingsLoading ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4" />
              <p>No data available for the selected time range</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  {Object.entries(metricColors).map(([metric, color]) => (
                    <linearGradient key={metric} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey={timeRange === "7d" || timeRange === "30d" ? "date" : "time"}
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Legend />
                {selectedMetrics.map((metric) => (
                  <Area
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={metricColors[metric as keyof typeof metricColors]}
                    fill={`url(#gradient-${metric})`}
                    strokeWidth={2}
                    dot={false}
                    name={metric.charAt(0).toUpperCase() + metric.slice(1)}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Device Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Device ID</dt>
                <dd className="font-mono">{device.deviceId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="capitalize">{device.type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Firmware</dt>
                <dd className="font-mono">{device.firmwareVersion ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Zone</dt>
                <dd>{device.zone ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Location</dt>
                <dd>{device.location ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Seen</dt>
                <dd>
                  {device.lastSeen
                    ? new Date(device.lastSeen).toLocaleString()
                    : "Never"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            {thresholds && thresholds.length > 0 ? (
              <dl className="space-y-3">
                {thresholds.map((t) => (
                  <div key={t.id} className="flex justify-between items-center">
                    <dt className="text-muted-foreground capitalize">{t.metric}</dt>
                    <dd className="text-sm">
                      {t.enabled ? (
                        <span>
                          {t.minValue ?? "—"} - {t.maxValue ?? "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Disabled</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground">No thresholds configured</p>
            )}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setThresholdDialogOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Thresholds
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Threshold Dialog */}
      <ThresholdConfigDialog
        deviceId={deviceId}
        open={thresholdDialogOpen}
        onOpenChange={setThresholdDialogOpen}
      />
    </div>
  );
}
