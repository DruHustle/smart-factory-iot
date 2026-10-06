import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const gatewaySchema = z.object({
  deviceId: z.string().trim().min(3, "Gateway ID must be at least 3 characters").max(64),
  name: z.string().trim().min(3, "Name must be at least 3 characters").max(255),
  location: z.string().trim().max(255).optional(),
  zone: z.string().trim().max(100).optional(),
});

type GatewayFormValues = z.infer<typeof gatewaySchema>;

interface CreateDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateDeviceDialog({ open, onOpenChange, onSuccess }: CreateDeviceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const utils = trpc.useUtils();
  const form = useForm<GatewayFormValues>({
    resolver: zodResolver(gatewaySchema),
    defaultValues: { deviceId: "", name: "", location: "", zone: "" },
  });

  const createMutation = trpc.devices.create.useMutation({
    onSuccess: () => {
      toast.success("Edge gateway registered");
      utils.devices.list.invalidate();
      utils.devices.getStats.invalidate();
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error) => toast.error(`Failed to register gateway: ${error.message}`),
    onSettled: () => setIsSubmitting(false),
  });

  const onSubmit = (values: GatewayFormValues) => {
    setIsSubmitting(true);
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Register an edge gateway</DialogTitle>
          <DialogDescription>
            Register an edge gateway that connects equipment to the platform. Create industrial machines under Assets, then attach them to this gateway and configure their protocol mapping there.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="deviceId" render={({ field }) => <FormItem>
              <FormLabel>Gateway ID</FormLabel><FormControl><Input placeholder="pi-edge-01" autoComplete="off" {...field} /></FormControl><FormMessage />
            </FormItem>} />
            <FormField control={form.control} name="name" render={({ field }) => <FormItem>
              <FormLabel>Gateway name</FormLabel><FormControl><Input placeholder="Plant A Edge Gateway" {...field} /></FormControl><FormMessage />
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
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Registering…" : "Register Gateway"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
