import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import {
  apiClient,
  clearAuthTokens,
  getStoredRefreshToken,
  getStoredToken,
  saveAuthTokens,
  getApiMode,
  setApiMode,
  type ApiMode,
  ApiError,
} from "./api/client";
import type { AuthResponse, Role, UserSummaryDto } from "./api/types";

interface AuthContextType {
  user: UserSummaryDto | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiMode: ApiMode;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
    phoneNumber?: string
  ) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchApiMode: (mode: ApiMode) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = "smartproperty_user_profile";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiMode, setApiModeState] = useState<ApiMode>("live");

  const switchApiMode = (newMode: ApiMode) => {
    setApiMode(newMode);
    setApiModeState(newMode);
  };

  const refreshUser = async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      // In live backend: GET /auth/me returns current user profile
      const userProfile = await apiClient.get<UserSummaryDto>("/auth/me");
      setUser(userProfile);
      setToken(currentToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
    } catch (err) {
      // If /auth/me fails or is mock, fallback to cached user in localStorage
      const cached = localStorage.getItem(USER_STORAGE_KEY);
      if (cached) {
        try {
          setUser(JSON.parse(cached));
          setToken(currentToken);
        } catch {
          clearAuthTokens();
          setUser(null);
          setToken(null);
        }
      } else {
        clearAuthTokens();
        setUser(null);
        setToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setApiModeState(getApiMode());
    const storedToken = getStoredToken();
    const cached = localStorage.getItem(USER_STORAGE_KEY);

    if (storedToken && cached) {
      try {
        setUser(JSON.parse(cached));
        setToken(storedToken);
      } catch {
        // invalid cached JSON
      }
    }

    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const authData = await apiClient.post<AuthResponse>(
        "/auth/login",
        { email, password },
        { skipAuth: true }
      );

      saveAuthTokens(authData.accessToken, authData.refreshToken);
      setToken(authData.accessToken);

      const userSummary: UserSummaryDto = {
        id: authData.userId,
        fullName: authData.fullName,
        email: authData.email,
        role: authData.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      setUser(userSummary);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userSummary));
      return authData;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
    phoneNumber?: string
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const authData = await apiClient.post<AuthResponse>(
        "/auth/register",
        {
          fullName,
          email,
          password,
          confirmPassword,
          phoneNumber: phoneNumber || null,
        },
        { skipAuth: true }
      );

      saveAuthTokens(authData.accessToken, authData.refreshToken);
      setToken(authData.accessToken);

      const userSummary: UserSummaryDto = {
        id: authData.userId,
        fullName: authData.fullName,
        email: authData.email,
        role: authData.role,
        isActive: true,
        phoneNumber,
        createdAt: new Date().toISOString(),
      };

      setUser(userSummary);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userSummary));
      return authData;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const refreshToken = getStoredRefreshToken();
      if (refreshToken) {
        await apiClient.post("/auth/revoke-token", { refreshToken }).catch(() => null);
      }
    } finally {
      clearAuthTokens();
      localStorage.removeItem(USER_STORAGE_KEY);
      setUser(null);
      setToken(null);
    }
  };

  const role = user?.role ?? null;
  const isAuthenticated = !!token && !!user;

  const contextValue = useMemo(
    () => ({
      user,
      token,
      role,
      isAuthenticated,
      isLoading,
      apiMode,
      login,
      register,
      logout,
      switchApiMode,
      refreshUser,
    }),
    [user, token, role, isAuthenticated, isLoading, apiMode]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

