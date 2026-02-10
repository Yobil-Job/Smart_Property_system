import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { UserSummaryDto, PagedResult, Role } from "@/lib/api/types";
import { UserTable } from "@/components/users/UserTable";
import { InviteUserDialog } from "@/components/users/InviteUserDialog";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
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

export const Route = createFileRoute("/_auth/users/")({
  component: UsersPage,
});

function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const queryParams = {
    pageNumber: page,
    pageSize: 10,
    search: search.trim() || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
    isActive:
      statusFilter === "active"
        ? true
        : statusFilter === "suspended"
        ? false
        : undefined,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["users", page, search, roleFilter, statusFilter],
    queryFn: () => apiClient.get<PagedResult<UserSummaryDto>>("/api/v1/users", queryParams),
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Administration Console
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage system identities, enforce role-based access, and oversee account activations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            className="h-9 gap-1.5 shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Provision User</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-card border rounded-xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email address..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>

          {/* Role Filter */}
          <Select
            value={roleFilter}
            onValueChange={(val) => {
              setRoleFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="Administrator">Administrator</SelectItem>
              <SelectItem value="Staff">Staff</SelectItem>
              <SelectItem value="Resident">Resident</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="suspended">Suspended Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* User Table */}
      <UserTable
        data={data}
        isLoading={isLoading}
        pageNumber={page}
        onPageChange={setPage}
      />

      {/* Provision User Modal */}
      <InviteUserDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
      />
    </div>
  );
}

