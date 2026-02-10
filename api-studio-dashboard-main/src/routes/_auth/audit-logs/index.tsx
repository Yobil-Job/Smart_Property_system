import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { AuditLogSummaryDto, AuditLogDetailDto, PagedResult } from "@/lib/api/types";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { JsonDiffModal } from "@/components/audit/JsonDiffModal";
import {
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_auth/audit-logs/")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogDetailDto | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState(false);

  const queryParams = {
    pageNumber: page,
    pageSize: 15,
    entityName: entityFilter !== "all" ? entityFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["auditLogs", page, entityFilter, actionFilter],
    queryFn: () => apiClient.get<PagedResult<AuditLogSummaryDto>>("/api/v1/audit-logs", queryParams),
  });

  const handleSelectLog = async (log: AuditLogSummaryDto) => {
    // If the summary already has previousState/newState (as in mock), use it, otherwise fetch detail
    if ("previousState" in log && "newState" in log) {
      setSelectedLog(log as unknown as AuditLogDetailDto);
      setIsDiffOpen(true);
      return;
    }

    try {
      const detail = await apiClient.get<AuditLogDetailDto>(`/api/v1/audit-logs/${log.id}`);
      setSelectedLog(detail);
      setIsDiffOpen(true);
    } catch {
      // Fallback
      setSelectedLog({
        ...log,
        previousState: null,
        newState: JSON.stringify(log, null, 2),
      });
      setIsDiffOpen(true);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Audit Log Explorer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Immutable regulatory compliance log of every create, update, and delete operation.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="h-9 gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          {/* Entity Type Selector */}
          <Select
            value={entityFilter}
            onValueChange={(val) => {
              setEntityFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[170px] bg-background">
              <SelectValue placeholder="All Entity Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entity Types</SelectItem>
              <SelectItem value="Property">Property</SelectItem>
              <SelectItem value="Building">Building</SelectItem>
              <SelectItem value="Apartment">Apartment</SelectItem>
              <SelectItem value="Resident">Resident</SelectItem>
              <SelectItem value="Staff">Staff</SelectItem>
              <SelectItem value="MaintenanceRequest">Maintenance Request</SelectItem>
              <SelectItem value="VisitorPass">Visitor Pass</SelectItem>
              <SelectItem value="User">User Account</SelectItem>
            </SelectContent>
          </Select>

          {/* Action Type Selector */}
          <Select
            value={actionFilter}
            onValueChange={(val) => {
              setActionFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="Create">Create (Inserts)</SelectItem>
              <SelectItem value="Update">Update (Mutations)</SelectItem>
              <SelectItem value="Delete">Delete (Removals)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audit Log Table */}
      <AuditLogTable
        data={data}
        isLoading={isLoading}
        pageNumber={page}
        onPageChange={setPage}
        onSelectLog={handleSelectLog}
      />

      {/* State Diff Modal */}
      <JsonDiffModal
        log={selectedLog}
        open={isDiffOpen}
        onOpenChange={setIsDiffOpen}
      />
    </div>
  );
}

