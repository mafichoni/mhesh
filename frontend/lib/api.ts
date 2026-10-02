import axios, { isAxiosError } from "axios";

export const TOKEN_KEY = "mhesh_token";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function logout(): void {
  try {
    clearToken();
    sessionStorage.clear();
  } catch {
    /* storage blocked */
  }
  if (typeof window !== "undefined") {
    window.location.href = "/mhesh";
  }
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isUnauthorized(e: unknown): boolean {
  return isAxiosError(e) && e.response?.status === 401;
}

export function errorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (isAxiosError(e)) {
    if (!e.response) {
      return "Could not reach the server. Please check your connection.";
    }
    const busy: unknown = e.response.data?.detail;
    if (e.response.status === 503 && typeof busy === "string") return busy;
    if (e.response.status >= 500) {
      return "The server encountered an error. Please try again shortly.";
    }
    const detail: unknown = e.response.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail
        .map((d: { loc?: unknown[]; msg?: string }) => {
          const field = d.loc?.[d.loc.length - 1];
          return field ? `${String(field)}: ${d.msg}` : d.msg;
        })
        .join("; ");
    }
  } else if (e instanceof Error && e.message) {
    return e.message;
  }
  return fallback;
}
