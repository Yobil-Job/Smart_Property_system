import React from "react";
import type { Priority } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  switch (priority) {
    case "Urgent":
      return (
        <Badge
          variant="destructive"
          className={`font-extrabold text-[10px] animate-pulse gap-1 ${className}`}
        >
          <AlertCircle className="h-3 w-3" />
          <span>Urgent</span>
        </Badge>
      );
    case "High":
      return (
        <Badge
          className={`bg-amber-600 hover:bg-amber-600 text-white font-bold text-[10px] gap-1 ${className}`}
        >
          <AlertTriangle className="h-3 w-3" />
          <span>High</span>
        </Badge>
      );
    case "Medium":
      return (
        <Badge
          variant="secondary"
          className={`font-semibold text-[10px] gap-1 ${className}`}
        >
          <ArrowUp className="h-3 w-3 text-muted-foreground" />
          <span>Medium</span>
        </Badge>
      );
    case "Low":
    default:
      return (
        <Badge
          variant="outline"
          className={`text-muted-foreground font-medium text-[10px] gap-1 ${className}`}
        >
          <ArrowDown className="h-3 w-3 text-muted-foreground" />
          <span>Low</span>
        </Badge>
      );
  }
}

