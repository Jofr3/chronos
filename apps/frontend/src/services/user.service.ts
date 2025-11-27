import type { ApiResponse, ApiError } from "@chronos/types/api";
import type { User } from "@chronos/types/user";

const API_BASE_URL = "http://localhost:8787";

interface ApiErrorResponse {
  data: null;
  success: false;
  message: string;
  error: ApiError;
}

class UserService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all users
   * @returns Promise with array of users
   */
  async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/api/users`);
    const data: ApiResponse<User[]> | ApiErrorResponse = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error?.message || errorData.message || "Failed to fetch users");
    }

    return (data as ApiResponse<User[]>).data;
  }

  /**
   * Get a user by ID
   * @param id - User ID
   * @returns Promise with user or null if not found
   */
  async getUserById(id: string): Promise<User | null> {
    const response = await fetch(`${this.baseUrl}/api/users/${id}`);
    
    if (response.status === 404) {
      return null;
    }

    const data: ApiResponse<User> | ApiErrorResponse = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error?.message || errorData.message || "Failed to fetch user");
    }

    return (data as ApiResponse<User>).data;
  }

  /**
   * Create a new user
   * @param userData - User data (email, username, and optional first_name/last_name)
   * @returns Promise with created user
   */
  async createUser(userData: { 
    email: string; 
    username: string; 
    first_name?: string; 
    last_name?: string 
  }): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data: ApiResponse<User> | ApiErrorResponse = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error?.message || errorData.message || "Failed to create user");
    }

    return (data as ApiResponse<User>).data;
  }

  /**
   * Update an existing user
   * @param id - User ID
   * @param userData - Partial user data to update
   * @returns Promise with updated user or null if not found
   */
  async updateUser(
    id: string,
    userData: Partial<{ email: string; username: string; first_name: string; last_name: string }>
  ): Promise<User | null> {
    const response = await fetch(`${this.baseUrl}/api/users/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    if (response.status === 404) {
      return null;
    }

    const data: ApiResponse<User> | ApiErrorResponse = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error?.message || errorData.message || "Failed to update user");
    }

    return (data as ApiResponse<User>).data;
  }

  /**
   * Delete a user
   * @param id - User ID
   * @returns Promise with boolean indicating success
   */
  async deleteUser(id: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/api/users/${id}`, {
      method: "DELETE",
    });

    if (response.status === 404) {
      return false;
    }

    const data: ApiResponse<{ id: string }> | ApiErrorResponse = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new Error(errorData.error?.message || errorData.message || "Failed to delete user");
    }

    return true;
  }
}

// Export a singleton instance
export const userService = new UserService();

// Also export the class for testing or custom instances
export { UserService };
