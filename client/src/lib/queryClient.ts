import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { useAuthStore } from "./auth-store";

function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.token || null;
    }
  } catch {
    return null;
  }
  return null;
}

let isRedirecting = false;

function clearAuthAndRedirect() {
  if (isRedirecting) return;
  isRedirecting = true;
  useAuthStore.getState().logout();
  if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
    window.location.href = '/login';
  }
  setTimeout(() => { isRedirecting = false; }, 2000);
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/');
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401 || (res.status === 403 && getAuthToken())) {
      const url = res.url || '';
      if (!isAuthEndpoint(url)) {
        clearAuthAndRedirect();
      }
    }
    let errorMessage = res.statusText;
    try {
      const data = await res.json();
      errorMessage = data.message || errorMessage;
    } catch {
      const text = await res.text();
      if (text) errorMessage = text;
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return undefined as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && (res.status === 401 || res.status === 403)) {
      return null;
    }

    if (res.status === 401 || (res.status === 403 && token)) {
      const url = queryKey[0] as string;
      if (!isAuthEndpoint(url)) {
        clearAuthAndRedirect();
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
