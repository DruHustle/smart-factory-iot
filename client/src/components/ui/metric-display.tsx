/**
 * Metric Display Component
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Displays KPI metrics
 * - Open/Closed: Extensible through props
 * - Liskov Substitution: Consistent interface
 * - Interface Segregation: Only required props
 * - Dependency Inversion: No hard dependencies
 */

import React from "react";
import { cn } from "@/lib/utils";

interface MetricDisplayProps {
  value: string | number;
  label: string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const MetricDisplay = React.forwardRef<
  HTMLDivElement,
  MetricDisplayProps
>(
  (
    {
      value,
      label,
      unit,
      trend,
      trendValue,
      icon,
      className,
    },
    ref
  ) => {
    const getTrendColor = () => {
      switch (trend) {
        case "up":
          return "text-success";
        case "down":
          return "text-destructive";
        default:
          return "text-muted-foreground";
      }
    };

    return (
      <div ref={ref} className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon && <div className="text-primary">{icon}</div>}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-primary">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {trend && trendValue && (
          <div className={cn("text-sm font-medium", getTrendColor())}>
            {trend === "up" && "↑"} {trend === "down" && "↓"} {trendValue}
          </div>
        )}
      </div>
    );
  }
);

MetricDisplay.displayName = "MetricDisplay";
