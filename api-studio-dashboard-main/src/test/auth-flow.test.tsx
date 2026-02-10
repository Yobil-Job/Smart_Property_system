import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/lib/auth";
import {
  saveAuthTokens,
  getStoredToken,
  getStoredRefreshToken,
  clearAuthTokens,
} from "@/lib/api/client";

function AuthConsumer() {
  const { isAuthenticated, role, user, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? "authenticated" : "anonymous"}</div>
      <div data-testid="user-role">{role ?? "none"}</div>
      <div data-testid="user-name">{user?.fullName ?? "none"}</div>
      <button onClick={logout} data-testid="logout-btn">Logout</button>
    </div>
  );
}

describe("Authentication & Session Flow", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("stores and retrieves JWT access and refresh tokens correctly", () => {
    const mockToken = "mock.jwt.token";
    const mockRefresh = "mock.refresh.token";

    saveAuthTokens(mockToken, mockRefresh);

    expect(getStoredToken()).toBe(mockToken);
    expect(getStoredRefreshToken()).toBe(mockRefresh);

    clearAuthTokens();

    expect(getStoredToken()).toBeNull();
    expect(getStoredRefreshToken()).toBeNull();
  });

  it("initializes with unauthenticated state when no token exists", async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("anonymous");
      expect(screen.getByTestId("user-role").textContent).toBe("none");
    });
  });

  it("hydrates authenticated state from stored user and token", async () => {
    const mockUser = {
      id: "u-admin",
      fullName: "Eleanor Vance",
      email: "admin@smartproperty.ai",
      role: "Administrator",
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("smartproperty_token", "mock.jwt.token");
    localStorage.setItem("smartproperty_user_profile", JSON.stringify(mockUser));

    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthConsumer />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("auth-status").textContent).toBe("authenticated");
      expect(screen.getByTestId("user-role").textContent).toBe("Administrator");
      expect(screen.getByTestId("user-name").textContent).toBe("Eleanor Vance");
    });
  });
});

