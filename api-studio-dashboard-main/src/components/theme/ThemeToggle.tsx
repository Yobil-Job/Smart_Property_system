import React from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground relative"
          title={`Current Theme: ${theme}`}
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4 transition-transform duration-200" />
          ) : (
            <Sun className="h-4 w-4 transition-transform duration-200" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={`gap-2 cursor-pointer ${theme === "light" ? "font-semibold text-primary" : ""}`}
        >
          <Sun className="h-3.5 w-3.5" />
          <span>Light Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={`gap-2 cursor-pointer ${theme === "dark" ? "font-semibold text-primary" : ""}`}
        >
          <Moon className="h-3.5 w-3.5" />
          <span>Dark Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={`gap-2 cursor-pointer ${theme === "system" ? "font-semibold text-primary" : ""}`}
        >
          <Laptop className="h-3.5 w-3.5" />
          <span>System Default</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

