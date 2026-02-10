import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { StaffDetailDto, PagedResult } from "@/lib/api/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserCheck, Loader2 } from "lucide-react";

interface AssignStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  currentStaffId?: string | null;
}

export function AssignStaffDialog({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  currentStaffId,
}: AssignStaffDialogProps) {
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState(currentStaffId ?? "");
  const [assignmentNotes, setAssignmentNotes] = useState("");

  const { data: staffData, isLoading } = useQuery<PagedResult<StaffDetailDto>>({
    queryKey: ["staff"],
    queryFn: () => apiClient.get<PagedResult<StaffDetailDto>>("/staff", { pageSize: 100 }),
    enabled: open,
  });

  const staffMembers = staffData?.items ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/maintenance/${ticketId}/assign`, {
        staffId,
        assignmentNotes: assignmentNotes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(`Technician assigned to ${ticketNumber}`);
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to assign staff");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId) {
      toast.error("Please select a staff member.");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <span>Dispatch Technician</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Assign responsibility for ticket {ticketNumber} to an operational staff member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="assign-staff">Select Technician *</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading staff roster...</span>
              </div>
            ) : (
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger id="assign-staff">
                  <SelectValue placeholder="Choose staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffMembers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.fullName} &bull; {s.position} ({s.propertyName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-notes">Assignment Instructions (optional)</Label>
            <Textarea
              id="assign-notes"
              placeholder="e.g. Please bring valve replacement kit and coordinate entry with resident."
              rows={3}
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              <span>Assign Staff</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

