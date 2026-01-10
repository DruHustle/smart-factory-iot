/**
 * Section Header Component
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Displays section headers
 * - Open/Closed: Extensible through props
 * - Liskov Substitution: Consistent interface
 * - Interface Segregation: Only required props
 * - Dependency Inversion: No hard dependencies
 */

import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader = React.forwardRef<
  HTMLDivElement,
  SectionHeaderProps
>(({ title, description, icon, action, className }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-start justify-between gap-4 mb-6", className)}
    >
      <div className="flex items-start gap-3 flex-1">
        {icon && <div className="text-primary mt-1">{icon}</div>}
        <div>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
});

SectionHeader.displayName = "SectionHeader";
