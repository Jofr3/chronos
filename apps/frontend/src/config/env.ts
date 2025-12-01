export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return "http://localhost:8787";
  }
  
  if (import.meta.env.PROD) {
    return "https://chronos-backend.jofrescari.workers.dev";
  }
  
  return "https://chronos-backend.jofrescari.workers.dev";
}

// Export configuration object for easy access
export const config = {
  apiBaseUrl: getApiBaseUrl(),
} as const;
