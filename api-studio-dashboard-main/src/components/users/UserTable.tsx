import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type { UserSummaryDto, PagedResult } from "@/lib/api/types";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  ShieldCheck,
  Shield,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface UserTableProps {
  data: PagedResult<UserSummaryDto> | undefined;
  isLoading: boolean;
  pageNumber: number;
  onPageChange: (page: number) => void;
}

export function UserTable({ data, isLoading, pageNumber, onPageChange }: UserTableProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [confirmUser, setConfirmUser] = useState<UserSummaryDto | null>(null);

  const toggleStatusMutation = useMutation({
    mutationFn: async (targetUser: UserSummaryDto) => {
      try {
        return await apiClient.patch<UserSummaryDto>(`/api/v1/users/${targetUser.id}/status`, {
          isActive: !targetUser.isActive,
        });
      } catch {
        return await apiClient.patch<UserSummaryDto>(`/api/v1/users/${targetUser.id}/toggle-status`);
      }
    },
    onSuccess: (updated) => {
      toast.success(
        `User ${updated.fullName} is now ${updated.isActive ? "Active" : "Suspended"}.`
      );
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setConfirmUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update user account status.");
    },
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "Administrator":
        return <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30">Admin</Badge>;
      case "Staff":
        return <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/30">Staff</Badge>;
      case "Resident":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Resident</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  if (isLoading) {
    return (
      <div className="border rounded-xl p-8 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading user directory...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border rounded-xl p-12 text-center bg-card">
        <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <h3 className="font-semibold text-base">No user accounts found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Adjust search criteria or create a new user account.
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
              <TableHead>User</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Account Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((u) => {
              const isSelf = currentUser?.id === u.id;

              return (
                <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <div>
                      <span className="font-semibold text-sm">{u.fullName}</span>
                      {isSelf && (
                        <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5 text-muted-foreground">
                          Current User
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{u.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="text-foreground">{u.email}</span>
                      </div>
                      {u.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <span>{u.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1 font-medium">
                        <UserCheck className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/30 gap-1 font-medium">
                        <UserX className="h-3 w-3" />
                        Suspended
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={u.isActive ? "outline" : "default"}
                      disabled={isSelf || toggleStatusMutation.isPending}
                      onClick={() => setConfirmUser(u)}
                      className="h-8 text-xs gap-1.5"
                    >
                      {u.isActive ? (
                        <>
                          <UserX className="h-3.5 w-3.5 text-rose-500" />
                          <span>Suspend</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Activate</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
        <span>
          Showing page <span className="font-semibold text-foreground">{pageNumber}</span> of{" "}
          <span className="font-semibold text-foreground">{totalPages}</span> ({data?.totalCount ?? 0} total users)
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

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={!!confirmUser} onOpenChange={(open) => !open && setConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmUser?.isActive ? "Suspend User Account?" : "Reactivate User Account?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              {confirmUser?.isActive ? (
                <>
                  Suspending <strong className="text-foreground">{confirmUser?.fullName}</strong> will
                  immediately revoke their active tokens and prevent login to the system.
                </>
              ) : (
                <>
                  Reactivating <strong className="text-foreground">{confirmUser?.fullName}</strong> will
                  allow them to log back into SmartProperty AI with their existing credentials.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleStatusMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmUser && toggleStatusMutation.mutate(confirmUser)}
              disabled={toggleStatusMutation.isPending}
              className={confirmUser?.isActive ? "bg-rose-600 hover:bg-rose-700" : ""}
            >
              {toggleStatusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {confirmUser?.isActive ? "Confirm Suspension" : "Reactivate Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

