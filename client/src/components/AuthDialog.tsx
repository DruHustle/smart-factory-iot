import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Factory } from "lucide-react";

interface AuthDialogProps {
  title?: string;
  description?: string;
  logo?: string;
  open?: boolean;
  onLogin: () => void;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function AuthDialog({
  title = "Smart Factory IoT Dashboard",
  description = "Please sign in to continue",
  logo,
  open = false,
  onLogin,
  onOpenChange,
  onClose,
}: AuthDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open);

  useEffect(() => {
    if (!onOpenChange) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(nextOpen);
    } else {
      setInternalOpen(nextOpen);
    }

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog
      open={onOpenChange ? open : internalOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="py-5 bg-card rounded-lg w-[400px] shadow-lg border border-border backdrop-blur-md p-0 gap-0 text-center">
        <div className="flex flex-col items-center gap-4 p-6 pt-8">
          {logo ? (
            <div className="w-16 h-16 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center">
              <img
                src={logo}
                alt="Dialog graphic"
                className="w-10 h-10 rounded-md"
              />
            </div>
          ) : (
            <div className="w-16 h-16 bg-primary/10 rounded-xl border border-primary/20 flex items-center justify-center">
              <Factory className="w-8 h-8 text-primary" />
            </div>
          )}

          {/* Title and subtitle */}
          {title ? (
            <DialogTitle className="text-xl font-semibold text-foreground leading-6 tracking-tight">
              {title}
            </DialogTitle>
          ) : null}
          <DialogDescription className="text-sm text-muted-foreground leading-5">
            {description}
          </DialogDescription>
        </div>

        <DialogFooter className="px-6 py-5">
          {/* Login button */}
          <Button
            onClick={onLogin}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium leading-5 transition-colors"
          >
            Sign In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
