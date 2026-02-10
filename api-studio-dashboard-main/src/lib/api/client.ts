import { handleMock, HttpError } from "./mock-server";
import type { ApiResponse, ErrorDetail } from "./types";

export function formatUserFriendlyErrorMessage(
  status: number,
  rawMessage: string,
  errors: ErrorDetail[] = []
): string {
  // 1. If we have specific field validation errors, present them in clear language
  if (errors.length > 0) {
    if (errors.length === 1) {
      const err = errors[0];
      const cleanField = err.property ? `${err.property}: ` : "";
      return `${cleanField}${err.message}`;
    }

    const bullets = errors
      .map((e) => (e.property ? `• ${e.property}: ${e.message}` : `• ${e.message}`))
      .join("\n");
    return `Please correct the following errors:\n${bullets}`;
  }

  // 2. Translate generic / technical error messages into clear user explanations
  const lower = (rawMessage || "").toLowerCase();

  if (
    lower.includes("validation failure") ||
    lower.includes("validation failed") ||
    lower.includes("one or more validation errors")
  ) {
    return "Please check the information you entered and ensure all required fields are filled out correctly.";
  }

  if (status === 409 || lower.includes("conflict") || lower.includes("already registered") || lower.includes("already exists")) {
    if (lower.includes("email")) {
      return "An account with this email address already exists. Please sign in instead.";
    }
    if (lower.includes("active resident") || lower.includes("already registered as an active resident")) {
      return "This resident user already has an active apartment assignment.";
    }
    if (lower.includes("apartment") || lower.includes("unit")) {
      return "This apartment unit number already exists in this building.";
    }
    return rawMessage || "This record already exists in the system.";
  }

  if (status === 401 || lower.includes("unauthorized") || lower.includes("token")) {
    return "Your session has expired or you are not signed in. Please log in to continue.";
  }

  if (status === 403 || lower.includes("forbidden")) {
    return "You do not have permission to perform this action. Please contact your property administrator.";
  }

  if (status === 404 || lower.includes("not found")) {
    if (lower.includes("apartment")) return "The selected apartment unit could not be found.";
    if (lower.includes("building")) return "The selected building could not be found.";
    if (lower.includes("property")) return "The selected property could not be found.";
    if (lower.includes("resident")) return "The resident profile could not be found.";
    return "The requested record could not be found.";
  }

  if (status === 0 || lower.includes("failed to fetch") || lower.includes("network")) {
    return "Unable to connect to SmartProperty AI services. Please verify that the API server is running and check your connection.";
  }

  if (status >= 500) {
    return "Our server encountered a temporary issue. Please try again or contact management support.";
  }

  return rawMessage || "An unexpected error occurred. Please try again.";
}

export class ApiError extends Error {
  public status: number;
  public errors: ErrorDetail[];
  public rawMessage: string;

  constructor(status: number, message: string, errors: ErrorDetail[] = []) {
    const userFriendlyMessage = formatUserFriendlyErrorMessage(status, message, errors);
    super(userFriendlyMessage);
    this.name = "ApiError";
    this.status = status;
    this.rawMessage = message;
    this.errors = errors;
  }
}

export function getFriendlyErrorMessage(
  err: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (err instanceof ApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    const lower = err.message.toLowerCase();
    if (
      lower.includes("validation failure") ||
      lower.includes("validation failed") ||
      lower.includes("one or more validation errors")
    ) {
      return "Please check the information you entered and ensure all required fields are filled out correctly.";
    }
    if (lower.includes("failed to fetch") || lower.includes("network")) {
      return "Unable to connect to SmartProperty AI server. Please verify your connection.";
    }
    return err.message;
  }
  if (typeof err === "string" && err.trim()) {
    return err;
  }
  return fallback;
}

const STORAGE_KEYS = {
  TOKEN: "smartproperty_token",
  REFRESH_TOKEN: "smartproperty_refresh_token",
  USER: "smartproperty_user",
  MODE: "smartproperty_api_mode",
};

export type ApiMode = "live" | "mock";

export function getApiMode(): ApiMode {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEYS.MODE);
    if (stored === "mock") return "mock";
  }
  return "live";
}

export function setApiMode(mode: ApiMode) {
  if (typeof window !== "undefined") {
    if (mode === "live") {
      localStorage.removeItem(STORAGE_KEYS.MODE);
    } else {
      localStorage.setItem(STORAGE_KEYS.MODE, mode);
    }
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

export function saveAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
}

export function clearAuthTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

const DEFAULT_BASE_URL = "http://localhost:5096/api/v1";

export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("smartproperty_api_url");
    if (customUrl) return customUrl.replace(/\/$/, "");
  }
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

export function getMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = getBaseUrl().replace(/\/api\/v1\/?$/, "");
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${base}${cleanPath}`;
}

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

async function executeRequest<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const mode = getApiMode();

  // 1. Mock Dispatcher
  if (mode === "mock") {
    try {
      const urlParams = new URLSearchParams();
      if (options.params) {
        Object.entries(options.params).forEach(([k, v]) => {
          if (v !== undefined && v !== null) {
            urlParams.append(k, String(v));
          }
        });
      }
      const token = options.skipAuth ? null : getStoredToken();
      const mockResult = handleMock(
        method.toUpperCase(),
        cleanEndpoint.startsWith("/api/v1") ? cleanEndpoint : `/api/v1${cleanEndpoint}`,
        urlParams,
        body,
        token
      ) as ApiResponse<T>;

      if (mockResult && typeof mockResult === "object" && "data" in mockResult) {
        return mockResult.data;
      }
      return mockResult as unknown as T;
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        throw new ApiError(err.status, err.message, err.errors);
      }
      throw new ApiError(500, err instanceof Error ? err.message : "Mock server error");
    }
  }

  // 2. Live HTTP Request
  const baseUrl = getBaseUrl();
  const url = new URL(`${baseUrl}${cleanEndpoint.replace(/^\/api\/v1/, "")}`);

  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.append(k, String(v));
      }
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  const token = getStoredToken();
  if (!options.skipAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    response = await fetch(url.toString(), {
      method: method.toUpperCase(),
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (netErr: unknown) {
    if (netErr instanceof DOMException && netErr.name === "AbortError") {
      throw new ApiError(
        0,
        `Connection timed out. The backend server at ${baseUrl} is not responding. Please check if the backend service is deployed and running on Render.`
      );
    }
    throw new ApiError(
      0,
      `Unable to connect to SmartProperty AI services at ${baseUrl}. Please check your connection or verify that the backend API is online.`
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Handle 401 Unauthorized with token refresh rotation
  if (response.status === 401 && !options.skipAuth) {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearAuthTokens();
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) {
          clearAuthTokens();
          throw new ApiError(401, "Session refresh failed. Please log in again.");
        }

        const refreshData: ApiResponse<{ accessToken: string; refreshToken: string }> =
          await refreshRes.json();
        saveAuthTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
        processQueue(null, refreshData.data.accessToken);

        // Replay original request
        headers["Authorization"] = `Bearer ${refreshData.data.accessToken}`;
        const replayedResponse = await fetch(url.toString(), {
          method: method.toUpperCase(),
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(replayedResponse);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthTokens();
        throw new ApiError(401, "Session expired. Please log in again.");
      } finally {
        isRefreshing = false;
      }
    } else {
      // Wait for refresh to complete
      return new Promise<T>((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken) => {
            headers["Authorization"] = `Bearer ${newToken}`;
            fetch(url.toString(), {
              method: method.toUpperCase(),
              headers,
              body: body ? JSON.stringify(body) : undefined,
            })
              .then((res) => handleResponse<T>(res))
              .then(resolve)
              .catch(reject);
          },
          reject,
        });
      });
    }
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  const isJson = contentType && contentType.includes("application/json");

  if (!isJson) {
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error ${response.status}: ${response.statusText}`);
    }
    return (await response.text()) as unknown as T;
  }

  const payload = (await response.json()) as any;

  if (!response.ok || (payload && payload.success === false)) {
    const errorMsg = payload?.message || payload?.title || `HTTP error ${response.status}`;
    
    // Normalize errors from array or ASP.NET validation dictionary
    const fieldErrors: ErrorDetail[] = [];
    if (Array.isArray(payload?.errors)) {
      payload.errors.forEach((e: any) => {
        fieldErrors.push({
          property: e.property || e.field || "",
          message: e.message || String(e),
        });
      });
    } else if (payload?.errors && typeof payload.errors === "object") {
      Object.entries(payload.errors).forEach(([prop, msgs]) => {
        if (Array.isArray(msgs)) {
          msgs.forEach((m) => fieldErrors.push({ property: prop, message: String(m) }));
        } else if (msgs) {
          fieldErrors.push({ property: prop, message: String(msgs) });
        }
      });
    }

    throw new ApiError(response.status, errorMsg, fieldErrors);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>, options?: RequestOptions) =>
    executeRequest<T>("GET", endpoint, undefined, { ...options, params }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("POST", endpoint, body, options),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("PUT", endpoint, body, options),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    executeRequest<T>("PATCH", endpoint, body, options),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    executeRequest<T>("DELETE", endpoint, undefined, options),
};

