import React from "react";
import { useAuth } from "@/lib/auth";
import { Sparkles, Wrench, UserCheck, BarChart3, HelpCircle } from "lucide-react";

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

export function PromptSuggestions({ onSelectPrompt }: PromptSuggestionsProps) {
  const { role } = useAuth();

  const getSuggestions = () => {
    switch (role) {
      case "Administrator":
        return [
          { text: "Give me a portfolio occupancy snapshot", icon: BarChart3 },
          { text: "Are there any urgent unassigned tickets?", icon: Wrench },
          { text: "How many visitors are currently on site?", icon: UserCheck },
          { text: "Summarize pending maintenance requests", icon: Sparkles },
        ];
      case "Staff":
        return [
          { text: "Show my active maintenance work orders", icon: Wrench },
          { text: "List visitors expected on site today", icon: UserCheck },
          { text: "Are there any urgent priority tasks?", icon: Sparkles },
          { text: "How do I update a ticket status to resolved?", icon: HelpCircle },
        ];
      case "Resident":
      default:
        return [
          { text: "My kitchen sink is leaking water", icon: Wrench },
          { text: "Pre-register a visitor for tomorrow at 2 PM", icon: UserCheck },
          { text: "Check status of my open maintenance tickets", icon: Sparkles },
          { text: "What are the building quiet hours and amenities?", icon: HelpCircle },
        ];
    }
  };

  const suggestions = getSuggestions();

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>Suggested Prompts</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((sug) => {
          const Icon = sug.icon;
          return (
            <button
              key={sug.text}
              type="button"
              onClick={() => onSelectPrompt(sug.text)}
              className="flex items-center gap-1.5 text-xs bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border px-3 py-1.5 rounded-xl transition-all shadow-2xs text-left cursor-pointer"
            >
              <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>{sug.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

