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
import {
  Cpu,
  Search,
  MoreVertical,
  Settings,
  Trash2,
  Eye,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ThresholdConfigDialog from "@/components/ThresholdConfigDialog";

type DeviceStatus = "online" | "offline" | "maintenance" | "error";
type DeviceType = "sensor" | "actuator" | "controller" | "gateway";

interface Device {
  id: number;
  name: string;
  deviceId: string;
  type: DeviceType;
  status: DeviceStatus;
  zone?: string;
  firmwareVersion?: string;
  lastSeen?: Date;
}

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
};

// Mock devices data
const mockDevices: Device[] = [
  {
    id: 1,
    name: "Pump Unit A",
    deviceId: "PUMP-001",
    type: "actuator",
    status: "online",
    zone: "Zone 1",
    firmwareVersion: "2.1.0",
    lastSeen: new Date(Date.now() - 5 * 60000),
  },
  {
    id: 2,
    name: "Temperature Sensor B1",
    deviceId: "TEMP-001",
    type: "sensor",
    status: "online",
    zone: "Zone 1",
    firmwareVersion: "1.5.2",
    lastSeen: new Date(Date.now() - 2 * 60000),
  },
  {
    id: 3,
    name: "Pressure Sensor B2",
    deviceId: "PRESS-001",
    type: "sensor",
    status: "online",
    zone: "Zone 2",
    firmwareVersion: "1.5.2",
    lastSeen: new Date(Date.now() - 1 * 60000),
  },
  {
    id: 4,
    name: "Motor Controller C",
    deviceId: "MOTOR-001",
    type: "controller",
    status: "maintenance",
    zone: "Zone 2",
    firmwareVersion: "3.0.1",
    lastSeen: new Date(Date.now() - 30 * 60000),
  },
  {
    id: 5,
    name: "Gateway Hub D",
    deviceId: "GATE-001",
    type: "gateway",
    status: "online",
    zone: "Central",
    firmwareVersion: "4.2.0",
    lastSeen: new Date(Date.now() - 10000),
  },
  {
    id: 6,
    name: "Humidity Sensor E",
    deviceId: "HUM-001",
    type: "sensor",
    status: "offline",
    zone: "Zone 3",
    firmwareVersion: "1.4.0",
    lastSeen: new Date(Date.now() - 2 * 3600000),
  },
];

export default function Devices() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const [thresholdDialogOpen, setThresholdDialogOpen] = useState(false);
  const [thresholdDeviceId, setThresholdDeviceId] = useState<number | null>(null);
  const [devices, setDevices] = useState<Device[]>(mockDevices);

  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.name.toLowerCase().includes(search.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      device.zone?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || device.status === statusFilter;
    const matchesType = typeFilter === "all" || device.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDelete = () => {
    if (selectedDevice) {
      setDevices(devices.filter((d) => d.id !== selectedDevice));
      toast.success("Device deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedDevice(null);
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
          <h1 className="text-2xl font-bold tracking-tight">Device Management</h1>
          <p className="text-muted-foreground">
            Manage and configure your IoT devices
          </p>
        </div>
        <Button size="sm" onClick={() => toast.info("Device creation coming soon")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or zone..."
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
        </CardContent>
      </Card>

      {/* Device Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            Devices ({filteredDevices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No devices found</h3>
              <p className="text-muted-foreground text-center">
                {search || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first device to get started"}
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
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {device.deviceId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={typeColors[device.type]}
                        >
                          {device.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[device.status]}>
                          {device.status}
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
                            <Button variant="ghost" size="icon">
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
                            <DropdownMenuItem
                              onClick={() => openThresholdConfig(device.id)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Configure Thresholds
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setSelectedDevice(device.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
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
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this device? This action cannot be
              undone and will remove all associated sensor data and alerts.
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
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Threshold Configuration Dialog */}
      {thresholdDeviceId && (
        <ThresholdConfigDialog
          deviceId={thresholdDeviceId}
          open={thresholdDialogOpen}
          onOpenChange={setThresholdDialogOpen}
        />
      )}
    </div>
  );
}
