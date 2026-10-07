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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  Cpu,
  Search,
  MoreVertical,
  Settings,
  Trash2,
  Eye,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ThresholdConfigDialog from "@/components/ThresholdConfigDialog";
import CreateDeviceDialog from "@/components/CreateDeviceDialog";
import { useAuth } from "@/contexts/AuthContext";
import { canAdministerUsers, canViewEngineering } from "@/lib/access";
import { getConnectivityRecordId } from "@/lib/device-display";

type DeviceStatus = "online" | "offline" | "maintenance" | "error";
type DeviceType = "sensor" | "actuator" | "controller" | "gateway" | "edge_device";

const statusColors: Record<DeviceStatus, string> = {
  online: "bg-success text-success-foreground",
  offline: "bg-muted text-muted-foreground",
  maintenance: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
};

const typeColors: Record<DeviceType, string> = {
  sensor: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  actuator: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  controller: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  gateway: "bg-chart-4/20 text-chart-4 border-chart-4/30",
  edge_device: "bg-chart-5/20 text-chart-5 border-chart-5/30",
};

export default function Devices() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [thresholdDeviceId, setThresholdDeviceId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: devices, isLoading, isError, error, refetch } = trpc.devices.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as DeviceStatus) : undefined,
    type: typeFilter !== "all" ? (typeFilter as DeviceType) : undefined,
  });

  const deleteMutation = trpc.devices.delete.useMutation({
    onSuccess: () => {
      toast.success("Device deleted successfully");
      utils.devices.list.invalidate();
      setDeleteDialogOpen(false);
      setSelectedDevice(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete device: ${error.message}`);
    },
  });

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (devices ?? []).filter((device) => !query || [
      device.name,
      getConnectivityRecordId(device),
      device.zone,
      device.location,
    ].some((value) => value?.toLocaleLowerCase().includes(query)));
  }, [devices, search]);

  const handleDelete = () => {
    if (selectedDevice) {
      deleteMutation.mutate({ id: selectedDevice });
    }
  };

  const openThresholdConfig = (deviceId: number) => {
    setThresholdDeviceId(deviceId);
    setThresholdDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Device Connectivity</h1>
          <p className="text-muted-foreground">
            Register gateways and edge devices, then monitor their connectivity.
          </p>
        </div>
        {canViewEngineering(user?.role) && (
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Device
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Search connectivity records"
                placeholder="Search by name, ID, or zone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger aria-label="Device status filter" className="w-full sm:w-40">
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
              <SelectTrigger aria-label="Device type filter" className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sensor">Sensor</SelectItem>
                <SelectItem value="actuator">Actuator</SelectItem>
                <SelectItem value="controller">Controller</SelectItem>
                <SelectItem value="gateway">Gateway</SelectItem>
                <SelectItem value="edge_device">Edge Device</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Device Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Connectivity records <span aria-live="polite">({filteredDevices.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div role="status" className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <RefreshCw aria-hidden="true" className="h-6 w-6 animate-spin" />
              Loading connectivity records…
            </div>
          ) : isError ? (
            <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-destructive">Connectivity records could not be loaded. {error?.message}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>Try again</Button>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No devices found</h3>
              <p className="text-muted-foreground text-center">
                {search || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Register a gateway or edge device"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Firmware</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                            <button
                              type="button"
                              className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                              onClick={() => setLocation(`/devices/${device.id}`)}
                            >
                              {device.name}
                            </button>
                          <p className="text-xs text-muted-foreground">
                            {getConnectivityRecordId(device)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={typeColors[device.type as DeviceType]}
                        >
                          <span className="capitalize">{device.type.replaceAll("_", " ")}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[device.status as DeviceStatus]}>
                          <span className="capitalize">{device.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{device.zone ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono">
                          {device.firmwareVersion ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {device.lastSeen
                            ? new Date(device.lastSeen).toLocaleString()
                            : "Never"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${device.name}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setLocation(`/devices/${device.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canViewEngineering(user?.role) && (
                              <DropdownMenuItem onClick={() => openThresholdConfig(device.id)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Configure Thresholds
                              </DropdownMenuItem>
                            )}
                            {canAdministerUsers(user?.role) && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  setSelectedDevice(device.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Device
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete selected device</DialogTitle>
            <DialogDescription>
              Remove this connectivity record? Existing telemetry history is retained. A gateway linked to an AAS asset must be disconnected from the asset first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Threshold Configuration Dialog */}
      {thresholdDeviceId && canViewEngineering(user?.role) && (
        <ThresholdConfigDialog
          deviceId={thresholdDeviceId}
          open={thresholdDialogOpen}
          onOpenChange={setThresholdDialogOpen}
        />
      )}

      {canViewEngineering(user?.role) && (
        <CreateDeviceDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      )}
    </div>
  );
}
