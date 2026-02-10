import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";
import { ResidentDashboard } from "@/components/dashboard/ResidentDashboard";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { role } = useAuth();

  switch (role) {
    case "Administrator":
      return <AdminDashboard />;
    case "Staff":
      return <StaffDashboard />;
    case "Resident":
    default:
      return <ResidentDashboard />;
  }
}
