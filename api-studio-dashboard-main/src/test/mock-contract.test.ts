import { describe, it, expect, beforeEach } from "vitest";
import { apiClient, setApiMode } from "@/lib/api/client";
import type {
  PropertySummaryDto,
  PagedResult,
  MaintenanceRequestSummaryDto,
  VisitorPassSummaryDto,
  MaintenanceAnalyticsDto,
} from "@/lib/api/types";

describe("Mock API Server Contract", () => {
  beforeEach(() => {
    localStorage.clear();
    setApiMode("mock");
    // Seed admin token for authenticated mock requests
    localStorage.setItem("smartproperty_token", "mock.u-admin.token");
  });

  it("returns paged properties with expected shape", async () => {
    const res = await apiClient.get<PagedResult<PropertySummaryDto>>("/api/v1/properties");

    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.totalCount).toBeGreaterThan(0);
    expect(res.items[0]).toHaveProperty("id");
    expect(res.items[0]).toHaveProperty("name");
    expect(res.items[0]).toHaveProperty("propertyType");
  });

  it("returns maintenance tickets with status and priority", async () => {
    const res = await apiClient.get<PagedResult<MaintenanceRequestSummaryDto>>("/api/v1/maintenance");

    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.totalCount).toBeGreaterThan(0);
    expect(res.items[0]).toHaveProperty("ticketNumber");
    expect(res.items[0]).toHaveProperty("status");
    expect(res.items[0]).toHaveProperty("priority");
  });

  it("returns visitor passes with expected fields", async () => {
    const res = await apiClient.get<PagedResult<VisitorPassSummaryDto>>("/api/v1/visitors");

    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.totalCount).toBeGreaterThan(0);
    expect(res.items[0]).toHaveProperty("visitorName");
    expect(res.items[0]).toHaveProperty("status");
  });

  it("returns maintenance analytics with SLA metrics", async () => {
    const res = await apiClient.get<MaintenanceAnalyticsDto>("/api/v1/analytics/maintenance");

    expect(res).toBeDefined();
    expect(res).toHaveProperty("totalRequests");
    expect(res).toHaveProperty("averageResolutionHours");
    expect(res).toHaveProperty("byCategory");
    expect(res).toHaveProperty("byPriority");
    expect(typeof res.resolutionRatePercentage).toBe("number");
  });
});

