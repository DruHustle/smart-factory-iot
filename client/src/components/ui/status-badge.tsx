/**
 * Status Badge Component
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Displays status indicators
 * - Open/Closed: Extensible status types
 * - Liskov Substitution: Consistent interface for all statuses
 * - Interface Segregation: Only required props
 * - Dependency Inversion: No hard dependencies on status logic
 */

import React from "react";
import { cn } from "@/lib/utils";

type StatusType = "online" | "offline" | "warning" | "critical" | "maintenance";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { color: string; bgColor: string; dotColor: string }
> = {
  online: {
    color: "text-success",
    bgColor: "bg-success/10",
    dotColor: "bg-success",
  },
  offline: {
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    dotColor: "bg-muted-foreground",
  },
  warning: {
    color: "text-warning",
    bgColor: "bg-warning/10",
    dotColor: "bg-warning",
  },
  critical: {
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    dotColor: "bg-destructive",
  },
  maintenance: {
    color: "text-primary",
    bgColor: "bg-primary/10",
    dotColor: "bg-primary",
  },
};

export const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, label, showDot = true, className }, ref) => {
    const config = statusConfig[status];
    const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
          config.bgColor,
          config.color,
          className
        )}
      >
        {showDot && (
          <div
            className={cn(
              "w-2 h-2 rounded-full animate-pulse-subtle",
              config.dotColor
            )}
          />
        )}
        {displayLabel}
      </div>
    );
  }
);

StatusBadge.displayName = "StatusBadge";
