export type UserRole = "user" | "developer";

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}
