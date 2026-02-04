import type { ApiResponse, ApiError } from "@chronos/types/api";
import type {
  TimeConstraint,
  CreateTimeConstraintRequest,
  UpdateTimeConstraintRequest,
} from "@chronos/types";
import { getApiBaseUrl } from "~/config/env";
import { getAuthToken } from "~/utils/auth";

interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

class ConstraintServiceClass {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = getAuthToken();
    const apiUrl = getApiBaseUrl();

    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    return response.json();
  }

  private handleError(
    result: ApiResponse<unknown>,
    fallbackMessage: string
  ): never {
    const errorResult = result as unknown as ApiErrorResponse;
    throw new Error(errorResult.error?.message || fallbackMessage);
  }

  async getAllConstraints(): Promise<TimeConstraint[]> {
    const result = await this.request<TimeConstraint[]>("/api/constraints");
    if (!result.success) {
      this.handleError(result, "Failed to fetch constraints");
    }
    return result.data!;
  }

  async getConstraint(id: string): Promise<TimeConstraint> {
    const result = await this.request<TimeConstraint>(`/api/constraints/${id}`);
    if (!result.success) {
      this.handleError(result, "Failed to fetch constraint");
    }
    return result.data!;
  }

  async createConstraint(
    data: CreateTimeConstraintRequest
  ): Promise<TimeConstraint> {
    const result = await this.request<TimeConstraint>("/api/constraints", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!result.success) {
      this.handleError(result, "Failed to create constraint");
    }
    return result.data!;
  }

  async updateConstraint(
    id: string,
    updates: UpdateTimeConstraintRequest
  ): Promise<TimeConstraint> {
    const result = await this.request<TimeConstraint>(
      `/api/constraints/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(updates),
      }
    );
    if (!result.success) {
      this.handleError(result, "Failed to update constraint");
    }
    return result.data!;
  }

  async deleteConstraint(id: string): Promise<void> {
    const result = await this.request<{ deleted: boolean }>(
      `/api/constraints/${id}`,
      { method: "DELETE" }
    );
    if (!result.success) {
      this.handleError(result, "Failed to delete constraint");
    }
  }
}

export const constraintService = new ConstraintServiceClass();
