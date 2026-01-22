/**
 * Frontend authentication utilities
 */

const AUTH_TOKEN_KEY = "chronos_auth_token";

/**
 * Get auth token from cookie (browser-safe)
 */
export function getAuthToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Set auth token in cookie
 */
export function setAuthToken(token: string, expiresInDays: number = 7): void {
  if (typeof document === "undefined") {
    return;
  }
  const expires = new Date();
  expires.setTime(expires.getTime() + expiresInDays * 24 * 60 * 60 * 1000);
  document.cookie = `${AUTH_TOKEN_KEY}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

/**
 * Clear auth token from cookie
 */
export function clearAuthToken(): void {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = `${AUTH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

/**
 * Check if user is authenticated (has valid token)
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Get authorization headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}
