import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  StaffDetailDto,
  UserSummaryDto,
  PropertySummaryDto,
  PagedResult,
} from "@/lib/api/types";
import {
  UserSquare2,
  UserPlus,
  Search,
  Building2,
  Briefcase,
  Mail,
  BadgeCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/staff/")({
  component: StaffPage,
});

function StaffPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form states
  const [userId, setUserId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [position, setPosition] = useState("Facility Technician");

  const { data, isLoading } = useQuery<PagedResult<StaffDetailDto>>({
    queryKey: ["staff", search],
    queryFn: () =>
      apiClient.get<PagedResult<StaffDetailDto>>("/staff", {
        search: search.trim() || undefined,
        pageSize: 50,
      }),
  });

  // Fetch staff users
  const { data: usersData } = useQuery<PagedResult<UserSummaryDto>>({
    queryKey: ["staffUsers"],
    queryFn: () => apiClient.get<PagedResult<UserSummaryDto>>("/users", { role: "Staff", pageSize: 100 }),
    enabled: isAddOpen,
  });

  // Fetch properties
  const { data: propertiesData } = useQuery<PagedResult<PropertySummaryDto>>({
    queryKey: ["properties"],
    queryFn: () => apiClient.get<PagedResult<PropertySummaryDto>>("/properties", { pageSize: 100 }),
    enabled: isAddOpen,
  });

  const addStaffMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post("/staff", {
        userId,
        propertyId,
        employeeNumber,
        position,
      });
    },
    onSuccess: () => {
      toast.success("Staff member assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      setUserId("");
      setPropertyId("");
      setEmployeeNumber("");
      setIsAddOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to onboard staff");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !propertyId || !employeeNumber) {
      toast.error("Please complete all required fields.");
      return;
    }
    addStaffMutation.mutate();
  };

  const staffMembers = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserSquare2 className="h-6 w-6 text-primary" />
            <span>Staff Roster & Assignments</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage operational personnel, property assignments, and technician roles
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          size="sm"
          className="font-semibold text-xs gap-1.5 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Staff Member</span>
        </Button>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card/60">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff by name, employee #, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading staff roster...</p>
        </div>
      ) : staffMembers.length === 0 ? (
        <div className="py-20 text-center border border-dashed rounded-2xl border-border bg-card/40 p-6 space-y-3">
          <UserSquare2 className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="font-semibold text-base text-foreground">No staff members found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search
              ? `No staff matching "${search}".`
              : "No staff members have been onboarded to properties yet."}
          </p>
          <Button
            onClick={() => setIsAddOpen(true)}
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Onboard First Staff</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Employee #</TableHead>
                <TableHead className="text-xs">Full Name</TableHead>
                <TableHead className="text-xs">Position</TableHead>
                <TableHead className="text-xs">Assigned Property</TableHead>
                <TableHead className="text-xs text-right">Duty Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((s) => (
                <TableRow key={s.id} className="hover:bg-accent/40">
                  <TableCell className="font-mono text-xs font-bold text-primary">
                    {s.employeeNumber}
                  </TableCell>

                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-foreground">{s.fullName}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span>{s.email}</span>
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s.position}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span>{s.propertyName}</span>
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
                      <BadgeCheck className="h-3 w-3" />
                      <span>On Duty</span>
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Onboard Staff Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Onboard Staff Member</DialogTitle>
            <DialogDescription className="text-xs">
              Assign a staff account to an operational property.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="st-user">Staff Account *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="st-user">
                  <SelectValue placeholder="Select staff account" />
                </SelectTrigger>
                <SelectContent>
                  {(usersData?.items ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="st-prop">Assigned Property *</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger id="st-prop">
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {(propertiesData?.items ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="st-empnum">Employee Number *</Label>
              <Input
                id="st-empnum"
                placeholder="e.g. EMP-1042"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="st-pos">Position / Role *</Label>
              <Input
                id="st-pos"
                placeholder="e.g. Facility Engineer, Security Lead"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addStaffMutation.isPending}>
                {addStaffMutation.isPending && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                <span>Onboard Staff</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

