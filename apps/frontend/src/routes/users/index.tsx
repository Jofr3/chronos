import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form, zod$, z } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { AuthUser } from "@chronos/types/auth";
import { userService } from "~/services/user.service";
import { getApiBaseUrl } from "~/config/env";

// Auth check - runs first
export const useAuthCheck = routeLoader$(async ({ redirect, cookie }) => {
  console.log("[Auth] Checking authentication...");
  
  const token = cookie.get("chronos_auth_token")?.value;
  console.log("[Auth] Token present:", !!token);

  if (!token) {
    console.log("[Auth] No token, redirecting to login");
    throw redirect(302, "/login");
  }

  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.log("[Auth] Invalid token, redirecting to login");
      cookie.delete("chronos_auth_token");
      throw redirect(302, "/login");
    }

    const data = await response.json();
    if (!data.success) {
      cookie.delete("chronos_auth_token");
      throw redirect(302, "/login");
    }

    console.log("[Auth] Authenticated as:", data.data?.email);
    return { user: data.data as AuthUser };
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }
    console.log("[Auth] Error:", error);
    cookie.delete("chronos_auth_token");
    throw redirect(302, "/login");
  }
});

export const useUsers = routeLoader$(async () => {
  try {
    const users = await userService.getAllUsers();
    return { users, error: null };
  } catch (error) {
    return { 
      users: [], 
      error: error instanceof Error ? error.message : "Failed to load users" 
    };
  }
});

export const useCreateUser = routeAction$(
  async (data, { fail }) => {
    try {
      await userService.createUser({
        email: data.email,
        username: data.username,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
      });
      return { success: true };
    } catch (error) {
      return fail(400, {
        message: error instanceof Error ? error.message : "Failed to create user",
      });
    }
  },
  zod$({
    email: z.string().email("Invalid email format"),
    username: z.string().min(1, "Username is required"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
  })
);

export default component$(() => {
  const authData = useAuthCheck();
  const usersSignal = useUsers();
  const createUserAction = useCreateUser();

  return (
    <div>
      {/* Header */}
      <header style="background: #fff; border-bottom: 1px solid #eee; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; margin: -24px -24px 24px -24px;">
        <div style="font-weight: 600; font-size: 18px;">Chronos</div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="color: #666; font-size: 14px;">
            {authData.value.user?.email}
          </span>
          <a href="/logout" style="color: #dc2626; text-decoration: none; font-size: 14px;">
            Logout
          </a>
        </div>
      </header>

      <h1>Users</h1>

      {/* Create User Form */}
      <div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #ddd;">
        <h2 style="margin-top: 0;">Create New User</h2>
        
        <Form action={createUserAction} style="display: flex; flex-direction: column; gap: 15px; max-width: 500px;">
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label for="email" style="font-weight: 500;">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
              placeholder="user@example.com"
            />
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label for="username" style="font-weight: 500;">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
              placeholder="johndoe"
            />
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label for="first_name" style="font-weight: 500;">First Name (optional):</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
              placeholder="John"
            />
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label for="last_name" style="font-weight: 500;">Last Name (optional):</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              style="padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;"
              placeholder="Doe"
            />
          </div>

          <button
            type="submit"
            style="padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; align-self: flex-start;"
            disabled={createUserAction.isRunning}
          >
            {createUserAction.isRunning ? "Creating..." : "Create User"}
          </button>
        </Form>

        {createUserAction.value?.success && (
          <div style="margin-top: 15px; padding: 10px; background: #d4edda; border: 1px solid #c3e6cb; color: #155724; border-radius: 4px;">
            User created successfully!
          </div>
        )}

        {createUserAction.value?.failed && (
          <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; border-radius: 4px;">
            Error: {createUserAction.value.message}
          </div>
        )}
      </div>
      
      {/* Error loading users */}
      {usersSignal.value.error && (
        <div style="color: red; padding: 10px; background: #fee; border: 1px solid #fcc; border-radius: 4px; margin-bottom: 20px;">
          Error: {usersSignal.value.error}
        </div>
      )}

      {/* Empty state */}
      {usersSignal.value.users.length === 0 && !usersSignal.value.error && (
        <div style="padding: 10px; background: #f0f0f0; border-radius: 4px;">
          No users found.
        </div>
      )}

      {/* Users table */}
      {usersSignal.value.users.length > 0 && (
        <div>
          <p style="font-weight: 500;">Total users: {usersSignal.value.users.length}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f0f0f0; border-bottom: 2px solid #ddd;">
                <th style="padding: 12px; text-align: left;">ID</th>
                <th style="padding: 12px; text-align: left;">Username</th>
                <th style="padding: 12px; text-align: left;">Email</th>
                <th style="padding: 12px; text-align: left;">First Name</th>
                <th style="padding: 12px; text-align: left;">Last Name</th>
                <th style="padding: 12px; text-align: left;">Created At</th>
              </tr>
            </thead>
            <tbody>
              {usersSignal.value.users.map((user) => (
                <tr key={user.id} style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px; font-family: monospace; font-size: 12px;">{user.id}</td>
                  <td style="padding: 12px;">{user.username}</td>
                  <td style="padding: 12px;">{user.email}</td>
                  <td style="padding: 12px;">{user.first_name || "-"}</td>
                  <td style="padding: 12px;">{user.last_name || "-"}</td>
                  <td style="padding: 12px;">
                    {new Date(user.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: "Users - Chronos",
  meta: [
    {
      name: "description",
      content: "User management page",
    },
  ],
};
