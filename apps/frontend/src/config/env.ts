export function getApiBaseUrl(): string {
  // Check for environment variable first (works in SSR)
  if (typeof process !== "undefined" && process.env?.API_BASE_URL) {
    return process.env.API_BASE_URL;
  }
  
  // Vite dev mode
  if (import.meta.env.DEV) {
    return "http://localhost:8787";
  }
  
  // Production
  if (import.meta.env.PROD) {
    return "https://chronos-backend.jofrescari.workers.dev";
  }
  
  // Default fallback for SSR in dev
  return "http://localhost:8787";
}

// Export configuration object for easy access
export const config = {
  apiBaseUrl: getApiBaseUrl(),
} as const;
