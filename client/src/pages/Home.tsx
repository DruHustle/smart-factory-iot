import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Cpu,
  Activity,
  AlertTriangle,
  Zap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: overview, isLoading, refetch } = trpc.analytics.getOverview.useQuery();
  const { data: oeeMetrics } = trpc.analytics.getOEEMetrics.useQuery();
  const seedMutation = trpc.devices.seedMockData.useMutation({
    onSuccess: (data) => {
      toast.success(`Created ${data.created} mock devices with sensor data`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to seed data: ${error.message}`);
    },
  });

  const deviceStats = overview?.devices ?? {
    total: 0,
    online: 0,
    offline: 0,
    maintenance: 0,
    error: 0,
    byType: {},
  };

  const alertStats = overview?.alerts ?? {
    total: 0,
    active: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
  };

  const kpiCards = [
    {
      title: "Total Devices",
      value: deviceStats.total,
      icon: Cpu,
      description: "Connected IoT devices",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Online",
      value: deviceStats.online,
      icon: CheckCircle2,
      description: `${deviceStats.total > 0 ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0}% availability`,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Active Alerts",
      value: alertStats.active,
      icon: AlertTriangle,
      description: `${alertStats.critical} critical`,
      color: alertStats.critical > 0 ? "text-destructive" : "text-warning",
      bgColor: alertStats.critical > 0 ? "bg-destructive/10" : "bg-warning/10",
    },
    {
      title: "OEE Score",
      value: oeeMetrics?.oee ? `${oeeMetrics.oee}%` : "—",
      icon: TrendingUp,
      description: "Overall Equipment Effectiveness",
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  const statusCards = [
    { label: "Online", value: deviceStats.online, icon: CheckCircle2, color: "text-success" },
    { label: "Offline", value: deviceStats.offline, icon: XCircle, color: "text-muted-foreground" },
    { label: "Maintenance", value: deviceStats.maintenance, icon: Wrench, color: "text-warning" },
    { label: "Error", value: deviceStats.error, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Factory Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your industrial IoT infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {deviceStats.total === 0 && (
            <Button
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Demo Data
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Device Status */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Device Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {statusCards.map((status) => (
                <div
                  key={status.label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <status.icon className={`h-5 w-5 ${status.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{status.value}</p>
                    <p className="text-xs text-muted-foreground">{status.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setLocation("/devices")}
            >
              View All Devices
            </Button>
          </CardContent>
        </Card>

        {/* Alert Summary */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alert Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-sm font-medium">Critical</span>
                </div>
                <span className="text-xl font-bold text-destructive">{alertStats.critical}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-warning" />
                  <span className="text-sm font-medium">Warning</span>
                </div>
                <span className="text-xl font-bold text-warning">{alertStats.warning}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-sm font-medium">Acknowledged</span>
                </div>
                <span className="text-xl font-bold">{alertStats.acknowledged}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setLocation("/alerts")}
            >
              View All Alerts
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* OEE Metrics */}
      {oeeMetrics && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-3" />
              OEE Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-3xl font-bold text-chart-1">{oeeMetrics.availability}%</p>
                <p className="text-sm text-muted-foreground mt-1">Availability</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-3xl font-bold text-chart-2">{oeeMetrics.performance}%</p>
                <p className="text-sm text-muted-foreground mt-1">Performance</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary/50">
                <p className="text-3xl font-bold text-chart-3">{oeeMetrics.quality}%</p>
                <p className="text-sm text-muted-foreground mt-1">Quality</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-3xl font-bold text-primary">{oeeMetrics.oee}%</p>
                <p className="text-sm text-muted-foreground mt-1">Overall OEE</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setLocation("/analytics")}
            >
              View Detailed Analytics
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
