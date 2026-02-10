import React from "react";
import type { VisitorStatus } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, UserCheck, LogOut, XCircle } from "lucide-react";

interface VisitorStatusBadgeProps {
  status: VisitorStatus;
  className?: string;
}

export function VisitorStatusBadge({ status, className = "" }: VisitorStatusBadgeProps) {
  switch (status) {
    case "Pending":
      return (
        <Badge
          variant="outline"
          className={`border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold text-[10px] gap-1 ${className}`}
        >
          <Clock className="h-3 w-3" />
          <span>Pending Approval</span>
        </Badge>
      );
    case "Approved":
      return (
        <Badge
          className={`bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-[10px] gap-1 ${className}`}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Pass Approved</span>
        </Badge>
      );
    case "CheckedIn":
      return (
        <Badge
          className={`bg-blue-600 hover:bg-blue-600 text-white font-semibold text-[10px] gap-1 ${className}`}
        >
          <UserCheck className="h-3 w-3" />
          <span>On Site</span>
        </Badge>
      );
    case "CheckedOut":
      return (
        <Badge
          variant="secondary"
          className={`font-medium text-[10px] gap-1 ${className}`}
        >
          <LogOut className="h-3 w-3" />
          <span>Checked Out</span>
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

