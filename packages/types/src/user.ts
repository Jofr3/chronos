export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
}
