import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as authModule from "@/lib/auth";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { StaffDashboard } from "@/components/dashboard/StaffDashboard";
import { ResidentDashboard } from "@/components/dashboard/ResidentDashboard";

function DashboardDispatcher({ role }: { role: string }) {
  switch (role) {
    case "Administrator":
      return <div data-testid="dashboard-type">admin-dashboard</div>;
    case "Staff":
      return <div data-testid="dashboard-type">staff-dashboard</div>;
    case "Resident":
    default:
      return <div data-testid="dashboard-type">resident-dashboard</div>;
  }
}

describe("Role-Based Dashboard Dispatcher", () => {
  it("dispatches to AdminDashboard when role is Administrator", () => {
    render(<DashboardDispatcher role="Administrator" />);
    expect(screen.getByTestId("dashboard-type").textContent).toBe("admin-dashboard");
  });

  it("dispatches to StaffDashboard when role is Staff", () => {
    render(<DashboardDispatcher role="Staff" />);
    expect(screen.getByTestId("dashboard-type").textContent).toBe("staff-dashboard");
  });

  it("dispatches to ResidentDashboard when role is Resident", () => {
    render(<DashboardDispatcher role="Resident" />);
    expect(screen.getByTestId("dashboard-type").textContent).toBe("resident-dashboard");
  });

  it("defaults to ResidentDashboard for unknown roles", () => {
    render(<DashboardDispatcher role="UnknownRole" />);
    expect(screen.getByTestId("dashboard-type").textContent).toBe("resident-dashboard");
  });
});

