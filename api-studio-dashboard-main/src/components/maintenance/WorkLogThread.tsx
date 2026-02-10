import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type { MaintenanceNoteDto } from "@/lib/api/types";
import {
  MessageSquare,
  Lock,
  Send,
  User,
  Clock,
  Shield,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface WorkLogThreadProps {
  ticketId: string;
  notes: MaintenanceNoteDto[];
}

export function WorkLogThread({ ticketId, notes }: WorkLogThreadProps) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [noteText, setNoteText] = useState("");
  const [isInternalOnly, setIsInternalOnly] = useState(false);

  const isStaffOrAdmin = role === "Staff" || role === "Administrator";

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/maintenance/${ticketId}/work-logs`, {
        noteText,
        isInternalOnly: isStaffOrAdmin ? isInternalOnly : false,
      });
    },
    onSuccess: () => {
      toast.success("Note added to ticket");
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      setNoteText("");
      setIsInternalOnly(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to add work log note");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNoteMutation.mutate();
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span>Work Logs & Communication</span>
          </div>
          <Badge variant="outline" className="text-xs font-semibold">
            {notes.length} {notes.length === 1 ? "entry" : "entries"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Notes Feed */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {notes.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-xl border-border bg-muted/10 space-y-1">
              <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold text-foreground">No notes posted yet</p>
              <p className="text-[11px] text-muted-foreground">
                Add an operational update, technician observation, or resident inquiry below.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`p-3.5 rounded-xl border transition-colors space-y-1.5 ${
                  note.isInternalOnly
                    ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
                    : "border-border bg-card/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                      <User className="h-3 w-3 text-primary" />
                      <span>{note.authorName}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                      {note.authorRole}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {note.isInternalOnly && (
                      <Badge variant="secondary" className="text-[9px] gap-1 h-4 bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        <Lock className="h-2.5 w-2.5" />
                        <span>Staff Internal</span>
                      </Badge>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(note.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                  {note.noteText}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleSubmit} className="pt-2 border-t border-border/60 space-y-2.5">
          <Textarea
            placeholder="Type a work note, diagnostic update, or message..."
            rows={2}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="text-xs resize-none"
          />

          <div className="flex items-center justify-between gap-2">
            {isStaffOrAdmin ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="internal-check"
                  checked={isInternalOnly}
                  onCheckedChange={(checked) => setIsInternalOnly(!!checked)}
                />
                <Label htmlFor="internal-check" className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                  <Lock className="h-3 w-3 text-amber-500" />
                  <span>Internal note (hidden from resident)</span>
                </Label>
              </div>
            ) : <div />}

            <Button
              type="submit"
              size="sm"
              disabled={!noteText.trim() || addNoteMutation.isPending}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              {addNoteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>Post Note</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

