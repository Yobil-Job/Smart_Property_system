import React, { useState } from "react";
import type { AuditLogSummaryDto, AuditLogDetailDto, PagedResult } from "@/lib/api/types";
import { JsonDiffModal } from "./JsonDiffModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileCode,
  Clock,
  User,
} from "lucide-react";

interface AuditLogTableProps {
  data: PagedResult<AuditLogSummaryDto> | undefined;
  isLoading: boolean;
  pageNumber: number;
  onPageChange: (newPage: number) => void;
  onSelectLog: (log: AuditLogSummaryDto) => void;
}

export function AuditLogTable({
  data,
  isLoading,
  pageNumber,
  onPageChange,
  onSelectLog,
}: AuditLogTableProps) {
  const getActionBadge = (action: string) => {
    switch (action) {
      case "Create":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            Create
          </Badge>
        );
      case "Update":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
            Update
          </Badge>
        );
      case "Delete":
        return (
          <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30">
            Delete
          </Badge>
        );
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="border rounded-xl p-8 flex flex-col items-center justify-center space-y-3">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading audit log entries...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-xl p-12 text-center bg-card">
        <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <h3 className="font-semibold text-base">No audit events found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No database mutations match the selected filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-xl overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead className="w-[120px]">Action</TableHead>
              <TableHead className="text-right w-[140px]">State Inspector</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((log) => (
              <TableRow key={log.id} className="hover:bg-muted/40 transition-colors">
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-sm">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{log.userName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {log.entityName}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {log.entityId}
                </TableCell>
                <TableCell>{getActionBadge(log.action)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelectLog(log)}
                    className="h-8 gap-1.5 text-xs hover:text-primary hover:bg-primary/10"
                  >
                    <FileCode className="h-3.5 w-3.5" />
                    <span>View Diff</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
        <span>
          Showing page <span className="font-semibold text-foreground">{pageNumber}</span> of{" "}
          <span className="font-semibold text-foreground">{totalPages}</span> ({data?.totalCount ?? 0} total logs)
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={pageNumber <= 1}
            onClick={() => onPageChange(pageNumber - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            disabled={pageNumber >= totalPages}
            onClick={() => onPageChange(pageNumber + 1)}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

