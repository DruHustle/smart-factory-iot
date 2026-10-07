import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const deviceSchema = z.object({
  type: z.enum(["gateway", "edge_device"]),
  deviceId: z.string().trim().min(3, "Device ID must be at least 3 characters").max(64),
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(255),
  location: z.string().trim().max(255).optional(),
  zone: z.string().trim().max(100).optional(),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

interface CreateDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateDeviceDialog({ open, onOpenChange, onSuccess }: CreateDeviceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils();
  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: { type: "gateway", deviceId: "", name: "", location: "", zone: "" },
  });

  const createMutation = trpc.devices.create.useMutation({
    onSuccess: () => {
      toast.success("Device registered");
      utils.devices.list.invalidate();
      utils.devices.getStats.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => toast.error(`Failed to register device: ${error.message}`),
    onSettled: () => setIsSubmitting(false),
  });

  const onSubmit = (values: DeviceFormValues) => {
    setIsSubmitting(true);
    createMutation.mutate(values);
  };

  const isGateway = form.watch("type") === "gateway";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Register gateway or edge device</DialogTitle>
          <DialogDescription>
            Register a gateway or an edge device. Industrial machines remain AAS assets and can be connected to a gateway from their AAS page.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="type" render={({ field }) => <FormItem>
              <FormLabel>Device type</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="gateway">Gateway</SelectItem><SelectItem value="edge_device">Edge Device</SelectItem></SelectContent></Select><FormMessage />
            </FormItem>} />
            <FormField control={form.control} name="deviceId" render={({ field }) => <FormItem>
              <FormLabel>{isGateway ? "Gateway ID" : "Edge device ID"}</FormLabel><FormControl><Input placeholder={isGateway ? "pi-edge-01" : "edge-device-01"} autoComplete="off" {...field} /></FormControl><FormMessage />
            </FormItem>} />
            <FormField control={form.control} name="name" render={({ field }) => <FormItem>
              <FormLabel>{isGateway ? "Gateway name" : "Edge device name"}</FormLabel><FormControl><Input placeholder={isGateway ? "Plant A Gateway" : "Line 1 Edge Device"} {...field} /></FormControl><FormMessage />
            </FormItem>} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="zone" render={({ field }) => <FormItem>
                <FormLabel>Zone</FormLabel><FormControl><Input placeholder="Plant A" {...field} /></FormControl><FormMessage />
              </FormItem>} />
              <FormField control={form.control} name="location" render={({ field }) => <FormItem>
                <FormLabel>Location</FormLabel><FormControl><Input placeholder="Control cabinet 1" {...field} /></FormControl><FormMessage />
              </FormItem>} />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registering…" : isGateway ? "Register Gateway" : "Register Edge Device"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
