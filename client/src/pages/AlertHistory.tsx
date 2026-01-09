import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  History,
  Search,
  CalendarIcon,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { format, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { ExportButton } from "@/components/ExportButton";

type AlertStatus = "active" | "acknowledged" | "resolved";
type AlertSeverity = "info" | "warning" | "critical";

const statusColors: Record<AlertStatus, string> = {
  active: "bg-destructive text-destructive-foreground",
  acknowledged: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
};

const severityColors: Record<AlertSeverity, string> = {
  info: "border-primary/50 bg-primary/5",
  warning: "border-warning/50 bg-warning/5",
  critical: "border-destructive/50 bg-destructive/5",
};

const severityIcons: Record<AlertSeverity, React.ElementType> = {
  info: Clock,
  warning: AlertTriangle,
  critical: XCircle,
};

export default function AlertHistory() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });

  const { data: alerts, isLoading, refetch } = trpc.alerts.list.useQuery({
    limit: 500,
  });

  const { data: devices } = trpc.devices.list.useQuery();

  const getDeviceName = (deviceId: number) => {
    const device = devices?.find((d) => d.id === deviceId);
    return device?.name ?? `Device ${deviceId}`;
  };

  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];

    return alerts.filter((alert) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        alert.message.toLowerCase().includes(searchLower) ||
        getDeviceName(alert.deviceId).toLowerCase().includes(searchLower) ||
        alert.type.toLowerCase().includes(searchLower);

      // Severity filter
      const matchesSeverity =
        severityFilter === "all" || alert.severity === severityFilter;

      // Date filter
      let matchesDate = true;
      if (dateRange.from && dateRange.to) {
        const alertDate = new Date(alert.createdAt);
        matchesDate = isWithinInterval(alertDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to),
        });
      }

      return matchesSearch && matchesSeverity && matchesDate;
    });
  }, [alerts, search, severityFilter, dateRange, devices]);

  // Group alerts by date
  const groupedAlerts = useMemo(() => {
    const groups: Record<string, typeof filteredAlerts> = {};
    filteredAlerts.forEach((alert) => {
      const date = format(new Date(alert.createdAt), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(alert);
    });
    return groups;
  }, [filteredAlerts]);

  const exportMutation = trpc.export.alertHistoryReport.useMutation();

  const handleExport = async () => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const result = await exportMutation.mutateAsync({
      startTime: dateRange.from?.getTime() ?? thirtyDaysAgo,
      endTime: dateRange.to?.getTime() ?? now,
      severity: severityFilter !== "all" ? (severityFilter as "info" | "warning" | "critical") : undefined,
    });
    return result;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alert History</h1>
          <p className="text-muted-foreground">
            Historical timeline of all system alerts
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search alerts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange.from && dateRange.to
                    ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                    : "Date Range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) =>
                    setDateRange({ from: range?.from, to: range?.to })
                  }
                  numberOfMonths={2}
                />
                {(dateRange.from || dateRange.to) && (
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: undefined, to: undefined })}
                    >
                      Clear dates
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Timeline ({filteredAlerts.length} alerts)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts found</h3>
              <p className="text-muted-foreground text-center">
                {search || severityFilter !== "all" || dateRange.from
                  ? "Try adjusting your filters"
                  : "No alert history available"}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedAlerts)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([date, dateAlerts]) => (
                  <div key={date}>
                    <div className="sticky top-0 bg-card z-10 py-2">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        {format(new Date(date), "EEEE, MMMM d, yyyy")}
                      </h3>
                    </div>
                    <div className="relative pl-6 border-l-2 border-border ml-2 space-y-4">
                      {dateAlerts.map((alert) => {
                        const SeverityIcon =
                          severityIcons[alert.severity as AlertSeverity];
                        return (
                          <div
                            key={alert.id}
                            className={`relative p-4 rounded-lg border ${
                              severityColors[alert.severity as AlertSeverity]
                            }`}
                          >
                            {/* Timeline dot */}
                            <div
                              className={`absolute -left-[calc(1.5rem+5px)] top-5 h-3 w-3 rounded-full border-2 ${
                                alert.severity === "critical"
                                  ? "bg-destructive border-destructive"
                                  : alert.severity === "warning"
                                  ? "bg-warning border-warning"
                                  : "bg-primary border-primary"
                              }`}
                            />

                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                              <div className="flex items-start gap-3">
                                <SeverityIcon
                                  className={`h-5 w-5 mt-0.5 ${
                                    alert.severity === "critical"
                                      ? "text-destructive"
                                      : alert.severity === "warning"
                                      ? "text-warning"
                                      : "text-primary"
                                  }`}
                                />
                                <div>
                                  <p className="font-medium">{alert.message}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Button
                                      variant="link"
                                      className="p-0 h-auto text-sm"
                                      onClick={() =>
                                        setLocation(`/devices/${alert.deviceId}`)
                                      }
                                    >
                                      {getDeviceName(alert.deviceId)}
                                    </Button>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-sm text-muted-foreground capitalize">
                                      {alert.type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                <Badge
                                  className={statusColors[alert.status as AlertStatus]}
                                >
                                  {alert.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(alert.createdAt), "HH:mm:ss")}
                                </span>
                              </div>
                            </div>

                            {/* Resolution info */}
                            {alert.status === "resolved" && alert.resolvedAt && (
                              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle className="h-4 w-4 text-success" />
                                Resolved at{" "}
                                {format(new Date(alert.resolvedAt), "MMM d, HH:mm")}
                              </div>
                            )}
                            {alert.status === "acknowledged" && alert.acknowledgedAt && (
                              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4 text-warning" />
                                Acknowledged at{" "}
                                {format(new Date(alert.acknowledgedAt), "MMM d, HH:mm")}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
