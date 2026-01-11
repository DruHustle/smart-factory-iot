import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Thermometer,
  Droplets,
  Zap,
  Gauge,
  RefreshCw,
  Search,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

type DeviceStatus = "online" | "offline" | "maintenance" | "error";

const statusColors: Record<DeviceStatus, string> = {
  online: "bg-success text-success-foreground",
  offline: "bg-muted text-muted-foreground",
  maintenance: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
};

export default function Monitoring() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

    {
      status: statusFilter !== "all" ? (statusFilter as DeviceStatus) : undefined,
      type: typeFilter !== "all" ? (typeFilter as "sensor" | "actuator" | "controller" | "gateway") : undefined,
    },
    { refetchInterval: 30000 } // Auto-refresh every 30 seconds
  );

  const filteredDevices = devices?.filter((device) =>
    device.name.toLowerCase().includes(search.toLowerCase()) ||
    device.deviceId.toLowerCase().includes(search.toLowerCase()) ||
    device.zone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Real-Time Monitoring</h1>
          <p className="text-muted-foreground">
            Live sensor data from {devices?.length ?? 0} devices
          </p>
        </div>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="sensor">Sensor</SelectItem>
            <SelectItem value="actuator">Actuator</SelectItem>
            <SelectItem value="controller">Controller</SelectItem>
            <SelectItem value="gateway">Gateway</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Device Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-5 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDevices?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No devices found</h3>
            <p className="text-muted-foreground text-center">
              {search || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your filters"
                : "Add devices to start monitoring"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDevices?.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onClick={() => setLocation(`/devices/${device.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({
  device,
  onClick,
}: {
  device: {
    id: number;
    deviceId: string;
    name: string;
    type: string;
    status: string;
    zone: string | null;
    location: string | null;
    lastSeen: Date | null;
  };
  onClick: () => void;
}) {
    { deviceId: device.id },
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  const status = device.status as DeviceStatus;

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        status === "error" ? "card-glow-error" : status === "online" ? "card-glow-success" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium truncate pr-2">
            {device.name}
          </CardTitle>
          <Badge className={statusColors[status]} variant="secondary">
            {status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {device.deviceId} • {device.zone ?? "No zone"}
        </p>
      </CardHeader>
      <CardContent>
        {latestReading ? (
          <div className="grid grid-cols-2 gap-3">
            {latestReading.temperature !== null && (
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-chart-2" />
                <div>
                  <p className="text-sm font-medium">{latestReading.temperature.toFixed(1)}°C</p>
                  <p className="text-xs text-muted-foreground">Temp</p>
                </div>
              </div>
            )}
            {latestReading.humidity !== null && (
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-chart-1" />
                <div>
                  <p className="text-sm font-medium">{latestReading.humidity.toFixed(1)}%</p>
                  <p className="text-xs text-muted-foreground">Humidity</p>
                </div>
              </div>
            )}
            {latestReading.power !== null && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-chart-5" />
                <div>
                  <p className="text-sm font-medium">{latestReading.power.toFixed(0)}W</p>
                  <p className="text-xs text-muted-foreground">Power</p>
                </div>
              </div>
            )}
            {latestReading.vibration !== null && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-4" />
                <div>
                  <p className="text-sm font-medium">{latestReading.vibration.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Vibration</p>
                </div>
              </div>
            )}
            {latestReading.rpm !== null && (
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-chart-3" />
                <div>
                  <p className="text-sm font-medium">{latestReading.rpm.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">RPM</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No sensor data available</div>
        )}
        {device.lastSeen && (
          <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
            Last seen: {new Date(device.lastSeen).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
