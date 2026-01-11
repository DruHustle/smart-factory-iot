import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical,
  RefreshCw,
  Eye,
  Check,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type AlertStatus = "active" | "acknowledged" | "resolved";
type AlertSeverity = "info" | "warning" | "critical";

const statusColors: Record<AlertStatus, string> = {
  active: "bg-destructive text-destructive-foreground",
  acknowledged: "bg-warning text-warning-foreground",
  resolved: "bg-success text-success-foreground",
};

const severityColors: Record<AlertSeverity, string> = {
  info: "bg-primary/20 text-primary border-primary/30",
  warning: "bg-warning/20 text-warning border-warning/30",
  critical: "bg-destructive/20 text-destructive border-destructive/30",
};

const severityIcons: Record<AlertSeverity, React.ElementType> = {
  info: Clock,
  warning: AlertTriangle,
  critical: XCircle,
};

export default function Alerts() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [severityFilter, setSeverityFilter] = useState<string>("all");


    status: statusFilter !== "all" ? (statusFilter as AlertStatus) : undefined,
    severity: severityFilter !== "all" ? (severityFilter as AlertSeverity) : undefined,
  });



    onSuccess: () => {
      toast.success("Alert status updated");
    },
    onError: (error) => {
      toast.error(`Failed to update alert: ${error.message}`);
    },
  });

  const getDeviceName = (deviceId: number) => {
    const device = devices?.find((d) => d.id === deviceId);
    return device?.name ?? `Device ${deviceId}`;
  };

  const handleAcknowledge = (alertId: number) => {
  };

  const handleResolve = (alertId: number) => {
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alert Management</h1>
          <p className="text-muted-foreground">
            Monitor and respond to system alerts
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={alertStats?.critical && alertStats.critical > 0 ? "card-glow-error" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive">
                  {alertStats?.critical ?? 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
        <Card className={alertStats?.warning && alertStats.warning > 0 ? "card-glow-warning" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warning</p>
                <p className="text-2xl font-bold text-warning">
                  {alertStats?.warning ?? 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Acknowledged</p>
                <p className="text-2xl font-bold">{alertStats?.acknowledged ?? 0}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold text-success">
                  {alertStats?.resolved ?? 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Alerts ({alerts?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : alerts?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-success mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts</h3>
              <p className="text-muted-foreground text-center">
                {statusFilter !== "all" || severityFilter !== "all"
                  ? "No alerts match your filters"
                  : "All systems operating normally"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts?.map((alert) => {
                    const SeverityIcon = severityIcons[alert.severity as AlertSeverity];
                    return (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={severityColors[alert.severity as AlertSeverity]}
                          >
                            <SeverityIcon className="h-3 w-3 mr-1" />
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => setLocation(`/devices/${alert.deviceId}`)}
                          >
                            {getDeviceName(alert.deviceId)}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <p className="max-w-xs truncate">{alert.message}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">
                            {alert.type.replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[alert.status as AlertStatus]}>
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLocation(`/devices/${alert.deviceId}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Device
                              </DropdownMenuItem>
                              {alert.status === "active" && (
                                <DropdownMenuItem
                                  onClick={() => handleAcknowledge(alert.id)}
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Acknowledge
                                </DropdownMenuItem>
                              )}
                              {alert.status !== "resolved" && (
                                <DropdownMenuItem
                                  onClick={() => handleResolve(alert.id)}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Resolve
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
