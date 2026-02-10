import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/api/types";
import {
  Building2,
  LayoutDashboard,
  Wrench,
  UserCheck,
  Users,
  ShieldAlert,
  BarChart3,
  Bot,
  Home,
  UserSquare2,
  FileText,
  Sparkles,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["Administrator", "Staff", "Resident"],
  },
  // Resident Specific
  {
    label: "My Residence",
    href: "/apartment",
    icon: Home,
    roles: ["Resident"],
  },
  // Property Management
  {
    label: "Properties & Units",
    href: "/properties",
    icon: Building2,
    roles: ["Administrator"],
  },
  // Maintenance Workflows
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Wrench,
    roles: ["Administrator", "Staff", "Resident"],
  },
  // Visitor Passes
  {
    label: "Visitor Passes",
    href: "/visitors",
    icon: UserCheck,
    roles: ["Administrator", "Staff", "Resident"],
  },
  // Building Amenities & Shared Spaces
  {
    label: "Building Amenities",
    href: "/amenities",
    icon: Sparkles,
    roles: ["Administrator", "Staff", "Resident"],
  },
  // People Directories
  {
    label: "Residents",
    href: "/residents",
    icon: Users,
    roles: ["Administrator", "Staff"],
  },
  {
    label: "Staff Roster",
    href: "/staff",
    icon: UserSquare2,
    roles: ["Administrator"],
  },
  // AI Assistant
  {
    label: "AI Assistant",
    href: "/assistant",
    icon: Bot,
    roles: ["Administrator", "Staff", "Resident"],
    badge: "Copilot",
  },
  // Intelligence & Audits
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["Administrator"],
  },
  {
    label: "Audit Logs",
    href: "/audit-logs",
    icon: FileText,
    roles: ["Administrator"],
  },
  {
    label: "User Accounts",
    href: "/users",
    icon: ShieldAlert,
    roles: ["Administrator"],
  },
  // Resources & Documentation
  {
    label: "Usage Guide",
    href: "/guide",
    icon: BookOpen,
    roles: ["Administrator", "Staff", "Resident"],
    badge: "Help",
  },
];

export function AppSidebar({ className = "" }: { className?: string }) {
  const { role, user } = useAuth();
  const location = useLocation();

  const currentRole = role ?? "Resident";
  const visibleNav = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside
      className={`w-64 border-r border-border bg-card/60 backdrop-blur-md flex flex-col h-screen sticky top-0 ${className}`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-border px-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20 transition-transform group-hover:scale-105">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm tracking-tight text-foreground flex items-center gap-1.5">
              SmartProperty
              <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.2 rounded-md">
                AI
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">
              Enterprise Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Role Badge Indicator */}
      <div className="px-5 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
            Current Role
          </span>
          <Badge
            variant={
              currentRole === "Administrator"
                ? "default"
                : currentRole === "Staff"
                ? "secondary"
                : "outline"
            }
            className="text-[10px] font-semibold tracking-wide"
          >
            {currentRole}
          </Badge>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/dashboard" && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/15"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </div>

              {item.badge ? (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  <Sparkles className="h-2.5 w-2.5" />
                  {item.badge}
                </span>
              ) : isActive ? (
                <ChevronRight className="h-3.5 w-3.5 opacity-80" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Footer User Info */}
      <div className="p-4 border-t border-border bg-card/40">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary">
            {user?.fullName?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {user?.fullName ?? "Signed In User"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

