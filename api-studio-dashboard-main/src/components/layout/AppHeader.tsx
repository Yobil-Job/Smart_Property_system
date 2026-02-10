import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  Bell,
  LogOut,
  User,
  Shield,
  Menu,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { toast } from "sonner";

export function AppHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate({ to: "/login" });
    } catch {
      toast.error("Logout encountered an issue, session cleared");
      navigate({ to: "/login" });
    }
  };

  const getRoleBadgeVariant = (userRole?: string) => {
    switch (userRole) {
      case "Administrator":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/30";
      case "Staff":
        return "bg-sky-500/10 text-sky-600 border-sky-500/30";
      case "Resident":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
      default:
        return "";
    }
  };

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle & Brand Context */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
          <span className="font-semibold text-foreground">SmartProperty AI</span>
          <span>/</span>
          <span className="text-xs sm:text-sm">
            {role ? `${role} Portal` : "Operations Workspace"}
          </span>
        </div>
      </div>

      {/* Right: Actions, Guide, Theme, Notifications & User Menu */}
      <div className="flex items-center gap-2.5">
        {/* User Guide Link Button */}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="h-8 px-2.5 text-xs font-medium gap-1.5 hidden sm:inline-flex hover:border-primary/50"
          title="Open User Guide & Documentation"
        >
          <Link to="/guide">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span>Usage Guide</span>
          </Link>
        </Button>

        {/* Theme Switcher */}
        <ThemeToggle />

        {/* Live Notification Center */}
        <NotificationCenter />

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 h-9 rounded-full border border-border/80 hover:bg-accent"
            >
              <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <span className="text-xs font-semibold text-foreground max-w-[120px] truncate hidden md:inline-block">
                {user?.fullName ?? "Account"}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 h-4 font-bold ${getRoleBadgeVariant(role)}`}
              >
                {role ?? "User"}
              </Badge>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-xs font-semibold leading-none text-foreground">
                  {user?.fullName}
                </p>
                <p className="text-[11px] leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Help & Guide */}
            <DropdownMenuItem asChild className="text-xs cursor-pointer gap-2">
              <Link to="/guide">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                <span>User Guide & Help</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Sign Out */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-xs text-destructive focus:text-destructive cursor-pointer gap-2"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
