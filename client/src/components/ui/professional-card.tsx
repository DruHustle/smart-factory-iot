/**
 * Professional Card Component
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Only handles card presentation
 * - Open/Closed: Extensible through props and children
 * - Liskov Substitution: Can be used anywhere a card is needed
 * - Interface Segregation: Minimal required props
 * - Dependency Inversion: No hard dependencies
 */

import React from "react";
import { cn } from "@/lib/utils";

interface ProfessionalCardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export const ProfessionalCard = React.forwardRef<
  HTMLDivElement,
  ProfessionalCardProps
>(
  (
    {
      children,
      className,
      elevated = false,
      interactive = false,
      onClick,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          "bg-card border border-border rounded-lg p-6 transition-all duration-200",
          elevated ? "shadow-lg" : "shadow-sm hover:shadow-md",
          interactive && "cursor-pointer hover:border-primary/50",
          className
        )}
      >
        {children}
      </div>
    );
  }
);

ProfessionalCard.displayName = "ProfessionalCard";
