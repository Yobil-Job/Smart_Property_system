import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConversationSessionList } from "@/components/ai/ConversationSessionList";
import { ChatContainer } from "@/components/ai/ChatContainer";
import { Bot, Sparkles, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_auth/assistant/")({
  component: AssistantPage,
});

function AssistantPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-7xl mx-auto space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">AI Property Copilot</h1>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 gap-1.5 py-0.5">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Autonomous Agent
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Multi-turn intelligent assistant with policy reasoning and verified tool execution.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Tool execution requires explicit confirmation</span>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Session History & Search */}
        <div className="md:col-span-4 lg:col-span-3.5 xl:col-span-3 h-full min-h-[300px]">
          <ConversationSessionList
            activeConversationId={selectedConversationId}
            onSelectConversation={(id) => setSelectedConversationId(id)}
            onNewConversation={() => setSelectedConversationId(null)}
          />
        </div>

        {/* Right: Active Chat Session */}
        <div className="md:col-span-8 lg:col-span-8.5 xl:col-span-9 h-full min-h-[450px]">
          <ChatContainer
            key={selectedConversationId ?? "new-session"}
            conversationId={selectedConversationId}
            onConversationCreated={(id) => setSelectedConversationId(id)}
          />
        </div>
      </div>
    </div>
  );
}

