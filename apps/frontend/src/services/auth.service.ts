import type { ApiResponse, ApiError } from "@chronos/types/api";
import type { AuthResponse, LoginRequest, SignupRequest, AuthUser } from "@chronos/types/auth";
import { getApiBaseUrl } from "~/config/env";

const TOKEN_KEY = "chronos_auth_token";

interface ApiErrorResponse {
  data: null;
  success: false;
  message: string;
  error: ApiError;
}

class AuthService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl();
  }

  /**
   * Register a new user
   * @param signupData - User signup data
   * @returns Promise with auth response containing user info and token
   */
  async signup(signupData: SignupRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signupData),
    });

    const data: ApiResponse<AuthResponse> | ApiErrorResponse = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error?.message || errorData.message || "Signup failed");
    }

    const result = (data as ApiResponse<AuthResponse>).data;
    
    // Store token
    this.setToken(result.token);
    
    return result;
  }

  /**
   * Login a user
   * @param loginData - User login credentials
   * @returns Promise with auth response containing user info and token
   */
  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    const data: ApiResponse<AuthResponse> | ApiErrorResponse = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error?.message || errorData.message || "Login failed");
    }

    const result = (data as ApiResponse<AuthResponse>).data;
    
    // Store token
    this.setToken(result.token);
    
    return result;
  }

  /**
   * Get current authenticated user
   * @returns Promise with user info or null if not authenticated
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    const token = this.getToken();
    
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      const data: ApiResponse<AuthUser> | ApiErrorResponse = await response.json();

      if (!response.ok || !data.success) {
        // Token is invalid, clear it
        this.removeToken();
        return null;
      }

      return (data as ApiResponse<AuthUser>).data;
    } catch {
      return null;
    }
  }

  /**
   * Logout the current user
   */
  logout(): void {
    this.removeToken();
  }

  /**
   * Check if user is authenticated (has token)
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get the stored auth token
   */
  getToken(): string | null {
    if (typeof localStorage === "undefined") {
      return null;
    }
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Store the auth token
   */
  private setToken(token: string): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
  }

  /**
   * Remove the auth token
   */
  private removeToken(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
  }
}

// Export a singleton instance
export const authService = new AuthService();

// Also export the class for testing or custom instances
export { AuthService };
