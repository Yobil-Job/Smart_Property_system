import React from "react";
import type { MaintenanceStatus } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  UserCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  Archive,
} from "lucide-react";

interface StatusBadgeProps {
  status: MaintenanceStatus;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  switch (status) {
    case "Pending":
      return (
        <Badge
          variant="outline"
          className={`border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-[10px] gap-1 ${className}`}
        >
          <Clock className="h-3 w-3" />
          <span>Pending Triage</span>
        </Badge>
      );
    case "Assigned":
      return (
        <Badge
          className={`bg-purple-600 hover:bg-purple-600 text-white font-semibold text-[10px] gap-1 ${className}`}
        >
          <UserCheck className="h-3 w-3" />
          <span>Assigned</span>
        </Badge>
      );
    case "InProgress":
      return (
        <Badge
          className={`bg-blue-600 hover:bg-blue-600 text-white font-semibold text-[10px] gap-1 ${className}`}
        >
          <Wrench className="h-3 w-3" />
          <span>In Progress</span>
        </Badge>
      );
    case "Resolved":
      return (
        <Badge
          className={`bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-[10px] gap-1 ${className}`}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Resolved</span>
        </Badge>
      );
    case "Closed":
      return (
        <Badge
          variant="secondary"
          className={`font-medium text-[10px] gap-1 ${className}`}
        >
          <Archive className="h-3 w-3" />
          <span>Closed</span>
        </Badge>
      );
    case "Rejected":
      return (
        <Badge
          variant="destructive"
          className={`font-semibold text-[10px] gap-1 ${className}`}
        >
          <XCircle className="h-3 w-3" />
          <span>Rejected</span>
        </Badge>
      );
    default:
      return <Badge variant="outline" className={`text-[10px] ${className}`}>{status}</Badge>;
  }
}

