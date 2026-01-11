import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  BarChart3,
  CalendarIcon,
  RefreshCw,
  TrendingUp,
  Zap,
  Thermometer,
  FileText,
  Download,
} from "lucide-react";
import { useState, useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";

type TimeRange = "24h" | "7d" | "30d" | "custom";

const COLORS = ["#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#eab308"];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  const { startTime, endTime } = useMemo(() => {
    const now = Date.now();
    if (timeRange === "custom" && customDateRange.from && customDateRange.to) {
      return {
        startTime: customDateRange.from.getTime(),
        endTime: customDateRange.to.getTime(),
      };
    }
    const ranges: Record<TimeRange, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      custom: 7 * 24 * 60 * 60 * 1000,
    };
    return { startTime: now - ranges[timeRange], endTime: now };
  }, [timeRange, customDateRange]);


    startTime,
    endTime,
    intervalMs: timeRange === "24h" ? 3600000 : 86400000, // 1 hour or 1 day
  });


  const chartData = useMemo(() => {
    if (!energyData) return [];
    return energyData.map((d) => ({
      ...d,
      time: format(new Date(d.timestamp), timeRange === "24h" ? "HH:mm" : "MMM dd"),
      avgTemperature: d.avgTemperature ? Math.round(d.avgTemperature * 10) / 10 : null,
      avgPower: d.avgPower ? Math.round(d.avgPower) : null,
      avgHumidity: d.avgHumidity ? Math.round(d.avgHumidity * 10) / 10 : null,
      avgVibration: d.avgVibration ? Math.round(d.avgVibration * 100) / 100 : null,
    }));
  }, [energyData, timeRange]);

  const deviceTypeData = useMemo(() => {
    if (!deviceStats?.byType) return [];
    return Object.entries(deviceStats.byType).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [deviceStats]);


  const handleExport = async () => {
      startTime,
      endTime,
    });
    return result;
  };

  const isLoading = oeeLoading || energyLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Performance metrics and energy consumption analysis
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton onExportHtml={handleExport} label="Export Report" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {customDateRange.from && customDateRange.to
                      ? `${format(customDateRange.from, "MMM dd")} - ${format(customDateRange.to, "MMM dd")}`
                      : "Pick dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: customDateRange.from, to: customDateRange.to }}
                    onSelect={(range) =>
                      setCustomDateRange({ from: range?.from, to: range?.to })
                    }
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </CardContent>
      </Card>

      {/* OEE Metrics */}
      {oeeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-3" />
              Overall Equipment Effectiveness (OEE)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* OEE Score Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-chart-1/10 border border-chart-1/20">
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <p className="text-3xl font-bold text-chart-1">{oeeMetrics.availability}%</p>
                </div>
                <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <p className="text-3xl font-bold text-chart-2">{oeeMetrics.performance}%</p>
                </div>
                <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
                  <p className="text-sm text-muted-foreground">Quality</p>
                  <p className="text-3xl font-bold text-chart-3">{oeeMetrics.quality}%</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-sm text-muted-foreground">Overall OEE</p>
                  <p className="text-3xl font-bold text-primary">{oeeMetrics.oee}%</p>
                </div>
              </div>

              {/* OEE Trend Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oeeMetrics.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="oee" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Energy Consumption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-chart-5" />
            Energy Consumption
          </CardTitle>
        </CardHeader>
        <CardContent>
          {energyLoading ? (
            <div className="flex items-center justify-center h-80">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <Zap className="h-12 w-12 mb-4" />
              <p>No energy data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="avgPower"
                  stroke="#eab308"
                  fill="url(#powerGradient)"
                  strokeWidth={2}
                  name="Avg Power (W)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Environmental Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-chart-2" />
              Temperature & Humidity Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {energyLoading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgTemperature"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    name="Avg Temp (°C)"
                  />
                  <Line
                    type="monotone"
                    dataKey="avgHumidity"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    name="Avg Humidity (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Device Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviceTypeData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-4" />
                <p>No device data available</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {deviceTypeData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Total Devices</p>
              <p className="text-2xl font-bold">{deviceStats?.total ?? 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Online Rate</p>
              <p className="text-2xl font-bold text-success">
                {deviceStats?.total
                  ? Math.round((deviceStats.online / deviceStats.total) * 100)
                  : 0}
                %
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Avg Power</p>
              <p className="text-2xl font-bold">
                {chartData.length > 0
                  ? Math.round(
                      chartData.reduce((acc, d) => acc + (d.avgPower ?? 0), 0) /
                        chartData.filter((d) => d.avgPower).length
                    )
                  : 0}
                W
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Avg Temperature</p>
              <p className="text-2xl font-bold">
                {chartData.length > 0
                  ? (
                      chartData.reduce((acc, d) => acc + (d.avgTemperature ?? 0), 0) /
                      chartData.filter((d) => d.avgTemperature).length
                    ).toFixed(1)
                  : 0}
                °C
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
