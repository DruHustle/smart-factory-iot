import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import {
  Download,
  Upload,
  RefreshCw,
  Play,
  RotateCcw,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Cpu,
  Package,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type DeploymentStatus = "pending" | "downloading" | "installing" | "completed" | "failed" | "rolled_back";

const statusColors: Record<DeploymentStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  downloading: "bg-primary text-primary-foreground",
  installing: "bg-primary text-primary-foreground",
  completed: "bg-success text-success-foreground",
  failed: "bg-destructive text-destructive-foreground",
  rolled_back: "bg-warning text-warning-foreground",
};

const statusIcons: Record<DeploymentStatus, React.ElementType> = {
  pending: Clock,
  downloading: Download,
  installing: RefreshCw,
  completed: CheckCircle,
  failed: XCircle,
  rolled_back: RotateCcw,
};

interface Deployment {
  id: number;
  deviceId: number;
  firmwareVersionId: number;
  previousVersion: string | null;
  status: string;
  progress: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export default function OTAUpdates() {
  const [deployDialogOpen, setDeployDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: deployments, isLoading, refetch } = trpc.ota.list.useQuery({
    limit: 50,
  });

  const { data: devices } = trpc.devices.list.useQuery();
  const { data: firmwareVersions } = trpc.firmware.list.useQuery();

  const deployMutation = trpc.ota.deploy.useMutation({
    onSuccess: () => {
      toast.success("Deployment initiated successfully");
      utils.ota.list.invalidate();
      setDeployDialogOpen(false);
      setSelectedDeviceId("");
      setSelectedFirmwareId("");
    },
    onError: (error) => {
      toast.error(`Failed to deploy: ${error.message}`);
    },
  });

  const rollbackMutation = trpc.ota.rollback.useMutation({
    onSuccess: (data) => {
      toast.success(`Rolled back to version ${data.restoredVersion}`);
      utils.ota.list.invalidate();
      utils.devices.list.invalidate();
      setRollbackDialogOpen(false);
      setSelectedDeployment(null);
    },
    onError: (error) => {
      toast.error(`Failed to rollback: ${error.message}`);
    },
  });

  const handleDeploy = () => {
    if (!selectedDeviceId || !selectedFirmwareId) {
      toast.error("Please select a device and firmware version");
      return;
    }
    deployMutation.mutate({
      deviceId: parseInt(selectedDeviceId),
      firmwareVersionId: parseInt(selectedFirmwareId),
    });
  };

  const handleRollback = () => {
    if (selectedDeployment) {
      rollbackMutation.mutate({ deploymentId: selectedDeployment.id });
    }
  };

  const getDeviceName = (deviceId: number) => {
    const device = devices?.find((d) => d.id === deviceId);
    return device?.name ?? `Device ${deviceId}`;
  };

  const getFirmwareVersion = (firmwareVersionId: number) => {
    const firmware = firmwareVersions?.find((f) => f.id === firmwareVersionId);
    return firmware?.version ?? "Unknown";
  };

  // Stats
  const stats = useMemo(() => {
    if (!deployments) return { pending: 0, inProgress: 0, completed: 0, failed: 0 };
    return {
      pending: deployments.filter((d: Deployment) => d.status === "pending").length,
      inProgress: deployments.filter((d: Deployment) => d.status === "downloading" || d.status === "installing").length,
      completed: deployments.filter((d: Deployment) => d.status === "completed").length,
      failed: deployments.filter((d: Deployment) => d.status === "failed" || d.status === "rolled_back").length,
    };
  }, [deployments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OTA Updates</h1>
          <p className="text-muted-foreground">
            Manage firmware deployments and rollbacks
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setDeployDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Deploy Update
          </Button>
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-primary">{stats.inProgress}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed/Rolled Back</p>
                <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Firmware Versions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Available Firmware Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {firmwareVersions && firmwareVersions.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {firmwareVersions.map((firmware) => (
                <div
                  key={firmware.id}
                  className="p-4 rounded-lg border border-border bg-secondary/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-medium">{firmware.version}</span>
                    {firmware.isStable && (
                      <Badge variant="outline" className="border-success text-success">
                        Stable
                      </Badge>
                    )}
                  </div>
                  {firmware.releaseNotes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {firmware.releaseNotes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Released: {new Date(firmware.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No firmware versions available</p>
          )}
        </CardContent>
      </Card>

      {/* Deployments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Deployment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : deployments?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Download className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No deployments</h3>
              <p className="text-muted-foreground text-center mb-4">
                Deploy your first firmware update to get started
              </p>
              <Button onClick={() => setDeployDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Deploy Update
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Firmware</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Previous</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments?.map((deployment: Deployment) => {
                    const StatusIcon = statusIcons[deployment.status as DeploymentStatus] || Clock;
                    const isInProgress = deployment.status === "downloading" || deployment.status === "installing";

                    return (
                      <TableRow key={deployment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <span>{getDeviceName(deployment.deviceId)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {getFirmwareVersion(deployment.firmwareVersionId)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={statusColors[deployment.status as DeploymentStatus] || statusColors.pending}
                          >
                            <StatusIcon
                              className={`h-3 w-3 mr-1 ${isInProgress ? "animate-spin" : ""}`}
                            />
                            {deployment.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress value={deployment.progress ?? 0} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {deployment.progress ?? 0}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">
                            {deployment.previousVersion ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {deployment.startedAt
                              ? new Date(deployment.startedAt).toLocaleString()
                              : "—"}
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
                              {(deployment.status === "completed" || deployment.status === "failed") &&
                                deployment.previousVersion && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedDeployment(deployment);
                                      setRollbackDialogOpen(true);
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Rollback
                                  </DropdownMenuItem>
                                )}
                              {deployment.errorMessage && (
                                <DropdownMenuItem
                                  onClick={() => toast.error(deployment.errorMessage)}
                                >
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  View Error
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

      {/* Deploy Dialog */}
      <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Firmware Update</DialogTitle>
            <DialogDescription>
              Select a device and firmware version to deploy
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Device</Label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {devices?.map((device) => (
                    <SelectItem key={device.id} value={device.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{device.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({device.firmwareVersion ?? "No firmware"})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Firmware Version</Label>
              <Select value={selectedFirmwareId} onValueChange={setSelectedFirmwareId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select firmware version" />
                </SelectTrigger>
                <SelectContent>
                  {firmwareVersions?.map((firmware) => (
                    <SelectItem key={firmware.id} value={firmware.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{firmware.version}</span>
                        {firmware.isStable && (
                          <Badge variant="outline" className="text-xs">
                            Stable
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeploy} disabled={deployMutation.isPending}>
              {deployMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Deploy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback Confirmation Dialog */}
      <Dialog open={rollbackDialogOpen} onOpenChange={setRollbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirm Rollback
            </DialogTitle>
            <DialogDescription>
              This will revert the device to firmware version{" "}
              <span className="font-mono font-medium">
                {selectedDeployment?.previousVersion}
              </span>
              . This action may cause temporary service interruption.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRollback}
              disabled={rollbackMutation.isPending}
            >
              {rollbackMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rolling back...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirm Rollback
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
