import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bot, Sparkles, X, Maximize2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChatContainer } from "./ChatContainer";

export function AiFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full shadow-lg shadow-primary/25 h-14 px-5 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-primary-foreground font-semibold flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <div className="relative">
              <Bot className="h-6 w-6" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <span>Property Copilot</span>
          </Button>
        </div>
      )}

      {/* Floating Drawer / Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-4rem)] bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b bg-muted/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm leading-none">SmartProperty Copilot</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                    Online
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Natural language assistant & tools
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                asChild
                title="Open Fullscreen Workspace"
              >
                <Link to="/assistant">
                  <Maximize2 className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Minimize Copilot"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat Container */}
          <div className="flex-1 overflow-hidden">
            <ChatContainer embedded={true} />
          </div>
        </div>
      )}
    </>
  );
}

