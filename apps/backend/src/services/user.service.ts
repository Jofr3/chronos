import type { D1 } from "@chronos/types/database";
import type { User } from "@chronos/types/user";
import * as userQueries from "../db/queries/users";

export class UserService {
  constructor(private db: D1) {}

  async getAllUsers(): Promise<User[]> {
    return userQueries.getAllUsers(this.db);
  }

  async getUserById(id: string): Promise<User | null> {
    return userQueries.getUserById(this.db, id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return userQueries.getUserByEmail(this.db, email);
  }

  async createUser(data: { email: string; name: string }): Promise<User> {
    if (!this.isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }

    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    return userQueries.createUser(this.db, data);
  }

  async updateUser(id: string, data: Partial<{ email: string; name: string }>): Promise<User | null> {
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }

    return userQueries.updateUser(this.db, id, data);
  }

  async deleteUser(id: string): Promise<boolean> {
    return userQueries.deleteUser(this.db, id);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
