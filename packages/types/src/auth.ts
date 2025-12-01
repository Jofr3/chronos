export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  message: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export interface UserWithPassword {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password_hash: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
}
