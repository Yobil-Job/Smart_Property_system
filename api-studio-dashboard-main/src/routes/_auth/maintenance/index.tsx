import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type {
  MaintenanceRequestSummaryDto,
  PagedResult,
  MaintenanceStatus,
  MaintenanceCategory,
  Priority,
} from "@/lib/api/types";
import { StatusBadge } from "@/components/maintenance/StatusBadge";
import { PriorityBadge } from "@/components/maintenance/PriorityBadge";
import { CreateTicketModal } from "@/components/maintenance/CreateTicketModal";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Building,
  Home,
  User,
  Calendar,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_auth/maintenance/")({
  component: MaintenanceListPage,
});

function MaintenanceListPage() {
  const { role } = useAuth();
  const isResident = role === "Resident";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const endpoint = isResident ? "/maintenance/my-requests" : "/maintenance";

  const { data, isLoading } = useQuery<PagedResult<MaintenanceRequestSummaryDto>>({
    queryKey: ["maintenance", role, search, statusFilter, categoryFilter, priorityFilter],
    queryFn: () =>
      apiClient.get<PagedResult<MaintenanceRequestSummaryDto>>(endpoint, {
        search: search.trim() || undefined,
        status: statusFilter !== "All" ? statusFilter : undefined,
        category: categoryFilter !== "All" ? categoryFilter : undefined,
        priority: priorityFilter !== "All" ? priorityFilter : undefined,
        pageSize: 50,
      }),
  });

  const tickets = data?.items ?? [];

  const statusTabs = [
    { label: "All Tickets", value: "All" },
    { label: "Pending Triage", value: "Pending" },
    { label: "In Progress", value: "InProgress" },
    { label: "Resolved", value: "Resolved" },
    { label: "Closed", value: "Closed" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span>{isResident ? "My Maintenance Requests" : "Maintenance & Work Orders"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isResident
              ? "Track resolution progress, work order updates, and report issues for your apartment"
              : "End-to-end operational ticketing lifecycle from report to dispatch and sign-off"}
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          size="sm"
          className="font-semibold text-xs gap-1.5 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Report New Issue</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {statusTabs.map((tab) => (
            <Button
              key={tab.value}
              variant={statusFilter === tab.value ? "secondary" : "ghost"}
              size="sm"
              className="h-8 text-xs px-3 font-semibold shrink-0"
              onClick={() => setStatusFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-border/60">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ticket number, title, unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Plumbing">Plumbing</SelectItem>
                <SelectItem value="Electrical">Electrical</SelectItem>
                <SelectItem value="HVAC">HVAC</SelectItem>
                <SelectItem value="Cleaning">Cleaning</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Structural">Structural</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 text-xs w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priorities</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading maintenance tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-border bg-card/40 p-6 space-y-3">
          <Wrench className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-base text-foreground">No maintenance tickets found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search || statusFilter !== "All" || categoryFilter !== "All"
              ? "No tickets match the selected filters."
              : "No maintenance requests are currently active."}
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create First Request</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ticket #</TableHead>
                <TableHead className="text-xs">Issue Title</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Assigned Technician</TableHead>
                <TableHead className="text-xs text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((tkt) => (
                <TableRow key={tkt.id} className="hover:bg-accent/40">
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    <Link
                      to="/maintenance/$id"
                      params={{ id: tkt.id }}
                      className="hover:underline"
                    >
                      {tkt.ticketNumber || `REQ-${tkt.id?.slice(0, 8).toUpperCase()}`}
                    </Link>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-0.5">
                      <Link
                        to="/maintenance/$id"
                        params={{ id: tkt.id }}
                        className="font-semibold text-xs text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {tkt.title}
                      </Link>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {tkt.category} &bull; {new Date(tkt.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Home className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{tkt.buildingName} &bull; Unit {tkt.apartmentNumber}</span>
                    </span>
                  </TableCell>

                  <TableCell>
                    <PriorityBadge priority={tkt.priority} />
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={tkt.status} />
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {tkt.assignedStaffName ? (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span>{tkt.assignedStaffName}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 italic">Unassigned</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link to="/maintenance/$id" params={{ id: tkt.id }}>
                      <Button variant="ghost" size="sm" className="h-8 text-xs font-semibold gap-1">
                        <span>Details</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}

