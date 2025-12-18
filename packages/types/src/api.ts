export interface ApiResponse<T> {
  data?: T;
  success: boolean;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
