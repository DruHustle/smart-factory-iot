/**
 * Home/Dashboard Page
 * 
 * Professional dashboard with real-time factory monitoring.
 * Works with mock data for GitHub Pages deployment.
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, Zap, TrendingUp, Activity, Cpu, Bell, BarChart3, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for dashboard
  const deviceStats = {
    total: 12,
    online: 10,
    offline: 1,
    maintenance: 1,
    error: 0,
    byType: { pump: 4, motor: 5, sensor: 3 },
  };

  const alertStats = {
    total: 5,
    active: 2,
    acknowledged: 1,
    resolved: 2,
    critical: 1,
    warning: 1,
  };

  const oeeMetrics = {
    oee: 87,
    availability: 92,
    performance: 95,
    quality: 98,
  };

  const getDeviceStatus = () => {
    if (deviceStats.error > 0) return "critical";
    if (deviceStats.maintenance > 0) return "warning";
    if (deviceStats.offline > 0) return "offline";
    return "online";
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
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
      value: `${oeeMetrics.oee}%`,
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Factory Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Real-time overview of your industrial IoT infrastructure
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="p-6 bg-card border-border hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="mb-2">
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </Card>
          );
        })}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Status Overview */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Device Status
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Current status of all connected devices</p>
          </div>
          <Card className="p-6 bg-card border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statusCards.map((card) => (
                <div key={card.label} className="text-center p-4 rounded-lg bg-background/50 border border-border">
                  <div className="text-2xl font-bold text-primary mb-2">
                    {card.value}
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {card.label}
                  </div>
                  <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${
                    card.status === 'online' ? 'bg-green-500/10 text-green-600' :
                    card.status === 'offline' ? 'bg-red-500/10 text-red-600' :
                    card.status === 'maintenance' ? 'bg-yellow-500/10 text-yellow-600' :
                    'bg-red-500/10 text-red-600'
                  }`}>
                    {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Common operations</p>
          </div>
          <div className="space-y-3">
            <Card 
              onClick={() => setLocation("/devices")}
              className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
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
            </Card>

            <Card 
              onClick={() => setLocation("/alerts")}
              className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Bell className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground">View Alerts</div>
                  <div className="text-xs text-muted-foreground">
                    {alertStats.active} active
                  </div>
                </div>
              </div>
            </Card>

            <Card 
              onClick={() => setLocation("/analytics")}
              className="p-4 bg-card border-border cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground">Analytics</div>
                  <div className="text-xs text-muted-foreground">View reports</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Alert Summary */}
      {alertStats.active > 0 && (
        <Card className="p-6 bg-card border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">
                Active Alerts
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                You have {alertStats.active} active alert
                {alertStats.active !== 1 ? "s" : ""} requiring attention.
                {alertStats.critical > 0 && (
                  <span className="text-red-600 font-medium ml-1">
                    {alertStats.critical} critical
                  </span>
                )}
              </p>
              <Button
                onClick={() => setLocation("/alerts")}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Bell className="w-4 h-4" />
                View Alerts
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
