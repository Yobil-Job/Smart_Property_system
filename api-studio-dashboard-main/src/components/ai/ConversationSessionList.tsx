import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ConversationSummaryDto, PagedResult } from "@/lib/api/types";
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  Bot,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ConversationSessionListProps {
  selectedId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

export function ConversationSessionList({
  selectedId,
  onSelectSession,
  onNewSession,
}: ConversationSessionListProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PagedResult<ConversationSummaryDto>>({
    queryKey: ["conversations"],
    queryFn: () => apiClient.get<PagedResult<ConversationSummaryDto>>("/ai/conversations"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/ai/conversations/${id}`),
    onSuccess: (_, deletedId) => {
      toast.success("Conversation deleted");
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      if (selectedId === deletedId) {
        onNewSession();
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete conversation");
    },
  });

  const sessions = data?.items ?? [];

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Action */}
      <Button
        onClick={onNewSession}
        size="sm"
        className="w-full text-xs font-semibold gap-1.5 shadow-xs h-9 justify-start"
      >
        <Plus className="h-4 w-4" />
        <span>New AI Conversation</span>
      </Button>

      {/* Sessions Scrollable Area */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground p-3 border border-dashed rounded-xl border-border">
            <Bot className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
            <p className="font-semibold text-foreground">No chats yet</p>
            <p className="text-[11px] mt-0.5">Start a fresh conversation with your AI assistant.</p>
          </div>
        ) : (
          sessions.map((s) => {
            const isSelected = selectedId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`group p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-primary/10 border-primary shadow-2xs"
                    : "border-border/60 bg-card/60 hover:bg-accent/50"
                }`}
              >
                <div className="min-w-0 space-y-0.5">
                  <h4
                    className={`text-xs font-semibold truncate ${
                      isSelected ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {s.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{new Date(s.updatedAt).toLocaleDateString()}</span>
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(s.id);
                  }}
                  aria-label="Delete session"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

