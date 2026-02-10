import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { MaintenanceStatus } from "@/lib/api/types";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  targetStatus: MaintenanceStatus;
  currentStatus: MaintenanceStatus;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  targetStatus,
  currentStatus,
}: StatusChangeDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      return apiClient.patch(`/maintenance/${ticketId}/status`, {
        newStatus: targetStatus,
        status: targetStatus,
        reason: reason.trim() || `Status updated from ${currentStatus} to ${targetStatus}`,
      });
    },
    onSuccess: () => {
      toast.success(`Ticket ${ticketNumber} transitioned to ${targetStatus}`);
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      setReason("");
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Transition Status to {targetStatus}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Confirming state change for {ticketNumber} (Currently {currentStatus}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="status-reason">
              Update Reason / Operational Notes
            </Label>
            <Textarea
              id="status-reason"
              placeholder={`e.g. ${
                targetStatus === "Resolved"
                  ? "Replaced pipe fittings, water flow verified, area cleaned."
                  : targetStatus === "Rejected"
                  ? "Issue is duplicate or outside property scope."
                  : "Technician began on-site diagnostics."
              }`}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
            <Button
              type="submit"
              size="sm"
              variant={targetStatus === "Rejected" ? "destructive" : "default"}
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              )}
              <span>Confirm & Transition</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

