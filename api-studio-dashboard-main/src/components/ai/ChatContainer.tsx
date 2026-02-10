import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import type {
  ConversationDetailDto,
  ConversationMessageDto,
  AiChatResponseDto,
  ConfirmActionResponseDto,
  PendingAction,
} from "@/lib/api/types";
import { MessageBubble } from "./MessageBubble";
import { ToolConfirmationCard } from "./ToolConfirmationCard";
import { PromptSuggestions } from "./PromptSuggestions";
import {
  Send,
  Bot,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ChatContainerProps {
  conversationId?: string | null;
  onConversationCreated?: (id: string) => void;
  embedded?: boolean;
}

export function ChatContainer({
  conversationId,
  onConversationCreated,
  embedded = false,
}: ChatContainerProps) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();

  const [activeId, setActiveId] = useState<string | null>(conversationId ?? null);
  const [inputText, setInputText] = useState("");
  const [executionResult, setExecutionResult] = useState<ConfirmActionResponseDto | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId !== undefined) {
      setActiveId(conversationId);
      setExecutionResult(null);
    }
  }, [conversationId]);

  const { data: conversation, isLoading } = useQuery<ConversationDetailDto>({
    queryKey: ["conversation", activeId],
    queryFn: () => apiClient.get<ConversationDetailDto>(`/ai/conversations/${activeId}`),
    enabled: !!activeId,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, conversation?.currentWorkflow]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      let currentSessionId = activeId;

      // If no session exists yet, start one
      if (!currentSessionId) {
        const newConv = await apiClient.post<ConversationDetailDto>("/ai/conversations", {
          title: text.slice(0, 36),
        });
        currentSessionId = newConv.id;
        setActiveId(newConv.id);
        if (onConversationCreated) onConversationCreated(newConv.id);
      }

      return apiClient.post<AiChatResponseDto>(
        `/ai/conversations/${currentSessionId}/messages`,
        { message: text }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", activeId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setInputText("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to send message to AI");
    },
  });

  // Confirm Tool Action mutation
  const confirmActionMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post<ConfirmActionResponseDto>(
        `/ai/conversations/${activeId}/confirm`,
        { confirmed: true }
      );
    },
    onSuccess: (res) => {
      setExecutionResult(res);
      toast.success(res.message || "Action executed successfully!");
      queryClient.invalidateQueries({ queryKey: ["conversation", activeId] });
      queryClient.invalidateQueries({ queryKey: ["maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["residentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["staffDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to execute action");
    },
  });

  // Cancel Tool Action mutation
  const cancelActionMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/ai/conversations/${activeId}/cancel`, {
        reason: "User cancelled from confirmation card",
      });
    },
    onSuccess: () => {
      toast.info("Action cancelled");
      queryClient.invalidateQueries({ queryKey: ["conversation", activeId] });
    },
  });

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputText.trim());
  };

  const handleSelectPrompt = (prompt: string) => {
    setInputText(prompt);
    sendMessageMutation.mutate(prompt);
  };

  const messages = conversation?.messages ?? [];
  const isAwaitingConfirmation = conversation?.status === "AwaitingConfirmation";
  const rawWorkflow = isAwaitingConfirmation ? conversation?.currentWorkflow : null;
  const pendingAction: PendingAction | null = React.useMemo(() => {
    if (!rawWorkflow) return null;
    if (rawWorkflow.pendingAction) return rawWorkflow.pendingAction;
    if (rawWorkflow.pendingActionJson) {
      try {
        return JSON.parse(rawWorkflow.pendingActionJson) as PendingAction;
      } catch {
        return null;
      }
    }
    return null;
  }, [rawWorkflow]);

  return (
    <div className={`flex flex-col h-full bg-card/60 backdrop-blur-md rounded-2xl border border-border overflow-hidden ${embedded ? "shadow-xl" : "shadow-sm"}`}>
      {/* Top Banner */}
      <div className="p-3.5 border-b border-border bg-card/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <span>SmartProperty Copilot</span>
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-bold">
                Online
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
              {conversation?.title ?? "Ask questions or execute workflows"}
            </p>
          </div>
        </div>

        {activeId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["conversation", activeId] })}
            title="Refresh conversation"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Welcome greeting if brand new conversation */}
        {messages.length === 0 && !isLoading && (
          <div className="py-8 space-y-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-foreground">
                How can I assist your property today?
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                I can autonomously report maintenance tickets, issue visitor passes, or check real-time building metrics.
              </p>
            </div>

            <PromptSuggestions onSelectPrompt={handleSelectPrompt} />
          </div>
        )}

        {/* Existing Messages */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Interactive Tool Confirmation Card */}
        {pendingAction && (
          <div className="my-2">
            <ToolConfirmationCard
              action={pendingAction}
              onConfirm={() => confirmActionMutation.mutate()}
              onCancel={() => cancelActionMutation.mutate()}
              isLoading={confirmActionMutation.isPending}
              result={executionResult}
            />
          </div>
        )}

        {/* Typing indicator */}
        {sendMessageMutation.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-3 bg-muted/40 rounded-xl w-fit animate-pulse">
            <Bot className="h-3.5 w-3.5 text-primary animate-spin" />
            <span>SmartProperty AI is analyzing & formulating response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-border bg-card/80">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input
            placeholder="Type a message or instruction (e.g. 'Register a visitor for tomorrow')..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sendMessageMutation.isPending}
            className="text-xs h-10 bg-background/80"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputText.trim() || sendMessageMutation.isPending}
            className="h-10 w-10 shrink-0 shadow-xs"
            aria-label="Send message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

