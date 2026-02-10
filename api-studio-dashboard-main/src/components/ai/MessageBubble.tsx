import React from "react";
import type { ConversationMessageDto } from "@/lib/api/types";
import { Bot, User, Sparkles, Clock } from "lucide-react";

interface MessageBubbleProps {
  message: ConversationMessageDto;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === "User";
  const isSystem = message.sender === "System";

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] bg-muted/60 text-muted-foreground px-3 py-1 rounded-full border border-border/50 italic">
          {message.content}
        </span>
      </div>
    );
  }

  // Basic markdown formatting: bold **text**, bullets • or -, newlines
  const formatContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Bold regex
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, pIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={pIdx} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <span key={idx} className="block min-h-[1.25rem]">
          {renderedLine}
        </span>
      );
    });
  };

  return (
    <div
      className={`flex items-start gap-3 my-3 animate-in fade-in-50 duration-200 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar Icon */}
      <div
        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted border border-border text-primary"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Bubble Container */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-1 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-xs"
            : "bg-card border border-border/80 text-foreground rounded-tl-xs shadow-xs"
        }`}
      >
        <div className="text-xs sm:text-sm leading-relaxed space-y-1">
          {formatContent(message.content)}
        </div>

        <div
          className={`flex items-center gap-1 text-[10px] pt-1 ${
            isUser ? "text-primary-foreground/75 justify-end" : "text-muted-foreground justify-start"
          }`}
        >
          <Clock className="h-2.5 w-2.5" />
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

