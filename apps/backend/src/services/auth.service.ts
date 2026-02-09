import type { DrizzleClient } from "../db/client";
import type { AuthResponse, SignupRequest, AuthUser } from "@chronos/types/auth";
import * as authQueries from "../db/queries/auth";
import {
  generateToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  isValidEmail,
  isValidPassword,
  type JwtPayload,
} from "../utils";

export class AuthService {
  constructor(
    private db: DrizzleClient,
    private jwtSecret: string
  ) {}

  /**
   * Verify and decode a JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    return verifyToken(token, this.jwtSecret);
  }

  /**
   * Get user by ID (for session validation)
   */
  async getUserById(id: string): Promise<AuthUser | null> {
    const user = await authQueries.getUserById(this.db, id);
    if (!user) {
      return null;
    }

    return {
      id: String(user.id),
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };
  }

  /**
   * Register a new user
   */
  async signup(data: SignupRequest): Promise<AuthResponse> {
    // Validate email format
    if (!isValidEmail(data.email)) {
      throw new Error("Invalid email format");
    }

    // Validate password strength
    const passwordValidation = isValidPassword(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // Check if user already exists
    const existingUser = await authQueries.userExistsByEmail(this.db, data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash the password
    const passwordHash = await hashPassword(data.password);

    // Generate username from email if not provided
    const username = data.username || data.email.split("@")[0];

    // Create the user
    const user = await authQueries.createUserWithPassword(this.db, {
      email: data.email,
      username: username,
      passwordHash: passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    const authUser: AuthUser = {
      id: String(user.id),
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };

    const token = await generateToken(
      {
        sub: String(user.id),
        email: authUser.email,
        username: authUser.username,
      },
      this.jwtSecret
    );

    return {
      user: authUser,
      token,
      message: "Account created successfully",
    };
  }

  /**
   * Authenticate a user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Validate email format
    if (!isValidEmail(email)) {
      throw new Error("Invalid email format");
    }

    // Get user by email
    const user = await authQueries.getUserByEmailWithPassword(this.db, email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user has a password set
    if (!user.password_hash) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new Error("Invalid email or password");
    }

    const authUser: AuthUser = {
      id: String(user.id),
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    };

    const token = await generateToken(
      {
        sub: authUser.id,
        email: authUser.email,
        username: authUser.username,
      },
      this.jwtSecret
    );

    return {
      user: authUser,
      token,
      message: "Login successful",
    };
  }
}
