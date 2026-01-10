/**
 * Home/Dashboard Page
 * 
 * Professional dashboard with real-time factory monitoring.
 * Follows SOLID principles with reusable components.
 */

import { Button } from "@/components/ui/button";
import { ProfessionalCard } from "@/components/ui/professional-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { MetricDisplay } from "@/components/ui/metric-display";
import { SectionHeader } from "@/components/ui/section-header";
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
  BarChart3,
  Bell,
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

  const getDeviceStatus = () => {
    if (deviceStats.error > 0) return "critical";
    if (deviceStats.maintenance > 0) return "warning";
    if (deviceStats.offline > 0) return "offline";
    return "online";
  };

  const kpiCards = [
    {
      title: "Total Devices",
      value: deviceStats.total,
      icon: Cpu,
      description: "Connected IoT devices",
      trend: "stable" as const,
    },
    {
      title: "Online",
      value: deviceStats.online,
      icon: CheckCircle2,
      description: `${deviceStats.total > 0 ? Math.round((deviceStats.online / deviceStats.total) * 100) : 0}% availability`,
      trend: "up" as const,
    },
    {
      title: "Active Alerts",
      value: alertStats.active,
      icon: AlertTriangle,
      description: `${alertStats.critical} critical`,
      trend: alertStats.critical > 0 ? ("up" as const) : ("stable" as const),
    },
    {
      title: "OEE Score",
      value: oeeMetrics?.oee ? `${oeeMetrics.oee}%` : "—",
      icon: TrendingUp,
      description: "Overall Equipment Effectiveness",
      trend: "stable" as const,
    },
  ];

  const statusCards = [
    { label: "Online", value: deviceStats.online, status: "online" as const },
    { label: "Offline", value: deviceStats.offline, status: "offline" as const },
    { label: "Maintenance", value: deviceStats.maintenance, status: "maintenance" as const },
    { label: "Critical", value: deviceStats.error, status: "critical" as const },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Factory Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time overview of your industrial IoT infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            size="sm"
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            Seed Data
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <ProfessionalCard key={card.title} className="gradient-primary">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <MetricDisplay
                value={card.value}
                label={card.title}
                icon={null}
              />
              <p className="text-xs text-muted-foreground mt-3">
                {card.description}
              </p>
            </ProfessionalCard>
          );
        })}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Status Overview */}
        <div className="lg:col-span-2">
          <SectionHeader
            title="Device Status"
            description="Current status of all connected devices"
            icon={<Activity className="w-5 h-5" />}
          />
          <ProfessionalCard elevated>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statusCards.map((card) => (
                <div key={card.label} className="text-center">
                  <div className="text-2xl font-bold text-primary mb-2">
                    {card.value}
                  </div>
                  <StatusBadge
                    status={card.status}
                    label={card.label}
                    showDot={false}
                    className="justify-center w-full"
                  />
                </div>
              ))}
            </div>
          </ProfessionalCard>
        </div>

        {/* Quick Actions */}
        <div>
          <SectionHeader
            title="Quick Actions"
            description="Common operations"
            icon={<Zap className="w-5 h-5" />}
          />
          <div className="space-y-3">
            <ProfessionalCard
              interactive
              onClick={() => setLocation("/devices")}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Cpu className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Manage Devices</div>
                  <div className="text-xs text-muted-foreground">View all devices</div>
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard
              interactive
              onClick={() => setLocation("/alerts")}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Bell className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="font-medium text-foreground">View Alerts</div>
                  <div className="text-xs text-muted-foreground">
                    {alertStats.active} active
                  </div>
                </div>
              </div>
            </ProfessionalCard>

            <ProfessionalCard
              interactive
              onClick={() => setLocation("/analytics")}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <BarChart3 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Analytics</div>
                  <div className="text-xs text-muted-foreground">View reports</div>
                </div>
              </div>
            </ProfessionalCard>
          </div>
        </div>
      </div>

      {/* Alert Summary */}
      {alertStats.active > 0 && (
        <ProfessionalCard elevated className="border-warning/30 bg-warning/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-warning/10">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Active Alerts
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                You have {alertStats.active} active alert
                {alertStats.active !== 1 ? "s" : ""} requiring attention.
                {alertStats.critical > 0 && (
                  <span className="text-destructive font-medium ml-1">
                    {alertStats.critical} critical
                  </span>
                )}
              </p>
              <Button
                onClick={() => setLocation("/alerts")}
                size="sm"
                className="gap-2"
              >
                <Bell className="w-4 h-4" />
                View Alerts
              </Button>
            </div>
          </div>
        </ProfessionalCard>
      )}

      {/* Empty State */}
      {isLoading && (
        <ProfessionalCard className="text-center py-12">
          <div className="animate-pulse">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </ProfessionalCard>
      )}
    </div>
  );
}
