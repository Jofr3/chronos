import { component$ } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form, zod$, z } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { userService } from "~/services/user.service";

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
  const usersSignal = useUsers();
  const createUserAction = useCreateUser();

  return (
    <div>
      <h1 style="margin-top: 0; font-size: 36px; color: var(--text-primary); font-weight: 700;">Users</h1>

      {/* Create User Form */}
      <div style="margin-bottom: 32px; padding: 28px; background: var(--bg-secondary); border-radius: 12px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
        <h2 style="margin-top: 0; font-size: 22px; color: var(--text-primary); font-weight: 600; margin-bottom: 24px;">Create New User</h2>
        
        <Form action={createUserAction} style="display: flex; flex-direction: column; gap: 20px; max-width: 600px;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label for="email" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
              onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
              onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
              placeholder="user@example.com"
            />
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label for="username" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
              onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
              onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
              placeholder="johndoe"
            />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label for="first_name" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">First Name <span style="color: var(--text-tertiary); font-weight: 400;">(optional)</span>:</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
                onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-secondary)"}
                onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                placeholder="John"
              />
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
              <label for="last_name" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Last Name <span style="color: var(--text-tertiary); font-weight: 400;">(optional)</span>:</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
                onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-secondary)"}
                onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                placeholder="Doe"
              />
            </div>
          </div>

          <button
            type="submit"
            style="padding: 12px 28px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; align-self: flex-start; box-shadow: var(--shadow-sm); transition: all 0.2s;"
            onMouseOver$={(e) => {
              (e.target as HTMLElement).style.transform = "translateY(-2px)";
              (e.target as HTMLElement).style.boxShadow = "var(--shadow-accent)";
            }}
            onMouseOut$={(e) => {
              (e.target as HTMLElement).style.transform = "translateY(0)";
              (e.target as HTMLElement).style.boxShadow = "var(--shadow-sm)";
            }}
            disabled={createUserAction.isRunning}
          >
            {createUserAction.isRunning ? "Creating..." : "Create User"}
          </button>
        </Form>

        {createUserAction.value?.success && (
          <div style="margin-top: 20px; padding: 14px 18px; background: rgba(16, 185, 129, 0.1); border: 1px solid var(--success); color: var(--success); border-radius: 8px; font-weight: 500;">
            User created successfully!
          </div>
        )}

        {createUserAction.value?.failed && (
          <div style="margin-top: 20px; padding: 14px 18px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); border-radius: 8px; font-weight: 500;">
            Error: {createUserAction.value.message}
          </div>
        )}
      </div>
      
      {/* Error loading users */}
      {usersSignal.value.error && (
        <div style="color: var(--error); padding: 14px 18px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); border-radius: 10px; margin-bottom: 24px; font-weight: 500;">
          Error: {usersSignal.value.error}
        </div>
      )}

      {/* Empty state */}
      {usersSignal.value.users.length === 0 && !usersSignal.value.error && (
        <div style="padding: 48px 24px; background: var(--bg-secondary); border-radius: 12px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
          <div style="font-size: 18px; color: var(--text-primary); font-weight: 500; margin-bottom: 8px;">No users found</div>
          <div style="color: var(--text-secondary);">Create your first user above to get started.</div>
        </div>
      )}

      {/* Users table */}
      {usersSignal.value.users.length > 0 && (
        <div style="background: var(--bg-secondary); padding: 28px; border-radius: 12px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="margin: 0; font-size: 20px; color: var(--text-primary); font-weight: 600;">All Users</h3>
            <span style="background: var(--accent-gradient); color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">
              {usersSignal.value.users.length} {usersSignal.value.users.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
              <thead>
                <tr style="background: var(--bg-tertiary);">
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color); border-top-left-radius: 8px;">ID</th>
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color);">Username</th>
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color);">Email</th>
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color);">First Name</th>
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color);">Last Name</th>
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color); border-top-right-radius: 8px;">Created At</th>
                </tr>
              </thead>
              <tbody>
                {usersSignal.value.users.map((user) => (
                  <tr key={user.id} style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;"
                    onMouseOver$={(e) => (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"}
                    onMouseOut$={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <td style="padding: 16px; font-family: monospace; font-size: 12px; color: var(--text-secondary);">{user.id}</td>
                    <td style="padding: 16px; color: var(--text-primary); font-weight: 500;">{user.username}</td>
                    <td style="padding: 16px; color: var(--accent-secondary); font-weight: 500;">{user.email}</td>
                    <td style="padding: 16px; color: var(--text-secondary);">{user.first_name || "-"}</td>
                    <td style="padding: 16px; color: var(--text-secondary);">{user.last_name || "-"}</td>
                    <td style="padding: 16px; color: var(--text-tertiary); font-size: 13px;">
                      {new Date(user.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
