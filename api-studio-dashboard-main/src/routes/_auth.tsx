import React, { useState } from "react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { AiFloatingWidget } from "@/components/ai/AiFloatingWidget";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If loading session state, show centered spinner
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Verifying security session...
          </p>
        </div>
      </div>
    );
  }

  // If unauthenticated, redirect to login
  if (!isAuthenticated) {
    // Navigate safely on render or via useEffect
    if (typeof window !== "undefined") {
      navigate({ to: "/login" });
    }
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
      {/* Desktop Persistent Sidebar */}
      <AppSidebar className="hidden md:flex" />

      {/* Mobile Drawer Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <AppSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-in fade-in-50 duration-200">
          <Outlet />
        </main>
        {/* Global Floating AI Copilot */}
        <AiFloatingWidget />
      </div>
    </div>
  );
}

