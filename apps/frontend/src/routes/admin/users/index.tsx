import { component$, useSignal } from "@builder.io/qwik";
import { routeLoader$, routeAction$, Form, zod$, z } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import { userService } from "~/services/user.service";
import type { User } from "@chronos/types/user";

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
      await userService.createUserWithPassword({
        email: data.email,
        username: data.username,
        password: data.password,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        role: data.role as "user" | "developer",
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
    password: z.string().min(8, "Password must be at least 8 characters"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.enum(["user", "developer"]).default("user"),
  })
);

export const useUpdateUser = routeAction$(
  async (data, { fail }) => {
    try {
      await userService.updateUser(data.id, {
        email: data.email || undefined,
        username: data.username || undefined,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
        role: data.role as "user" | "developer",
      });
      return { success: true };
    } catch (error) {
      return fail(400, {
        message: error instanceof Error ? error.message : "Failed to update user",
      });
    }
  },
  zod$({
    id: z.string(),
    email: z.string().email("Invalid email format").optional(),
    username: z.string().min(1, "Username is required").optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.enum(["user", "developer"]),
  })
);

export const useDeleteUser = routeAction$(async (data, { fail }) => {
  try {
    await userService.deleteUser(data.id);
    return { success: true };
  } catch (error) {
    return fail(400, {
      message: error instanceof Error ? error.message : "Failed to delete user",
    });
  }
},
zod$({
  id: z.string(),
}));

export default component$(() => {
  const usersSignal = useUsers();
  const createUserAction = useCreateUser();
  const updateUserAction = useUpdateUser();
  const deleteUserAction = useDeleteUser();
  const editingUser = useSignal<User | null>(null);

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

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label for="password" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
              onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
              onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
              placeholder="At least 8 characters"
            />
            {createUserAction.value?.fieldErrors?.password && (
              <span style="color: var(--error); font-size: 13px; font-weight: 500;">
                {createUserAction.value.fieldErrors.password}
              </span>
            )}
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

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label for="role" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Role:</label>
            <select
              id="role"
              name="role"
              style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s; cursor: pointer;"
              onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
              onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
            >
              <option value="user">User</option>
              <option value="developer">Developer</option>
            </select>
          </div>

          <button
            type="submit"
            style="padding: 12px 28px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; align-self: flex-start; box-shadow: var(--shadow-sm); transition: all 0.2s;"
            onMouseOver$={(e) => {
              const el = e.target as HTMLElement;
              if (el) {
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = "var(--shadow-accent)";
              }
            }}
            onMouseOut$={(e) => {
              const el = e.target as HTMLElement;
              if (el) {
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "var(--shadow-sm)";
              }
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
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color);">Role</th>
                  <th style="padding: 14px 16px; text-align: left; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color);">Created At</th>
                  <th style="padding: 14px 16px; text-align: center; color: var(--text-secondary); font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid var(--border-color); border-top-right-radius: 8px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersSignal.value.users.map((user) => (
                  <tr key={user.id} style="border-bottom: 1px solid var(--border-color); transition: background 0.2s;"
                    onMouseOver$={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      if (el) el.style.background = "var(--bg-elevated)";
                    }}
                    onMouseOut$={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      if (el) el.style.background = "transparent";
                    }}
                  >
                    <td style="padding: 16px; font-family: monospace; font-size: 12px; color: var(--text-secondary);">{user.id}</td>
                    <td style="padding: 16px; color: var(--text-primary); font-weight: 500;">{user.username}</td>
                    <td style="padding: 16px; color: var(--accent-secondary); font-weight: 500;">{user.email}</td>
                    <td style="padding: 16px; color: var(--text-secondary);">{user.first_name || "-"}</td>
                    <td style="padding: 16px; color: var(--text-secondary);">{user.last_name || "-"}</td>
                    <td style="padding: 16px;">
                      <span style={`padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; ${user.role === 'developer' ? 'background: rgba(139, 92, 246, 0.1); color: #8b5cf6;' : 'background: rgba(59, 130, 246, 0.1); color: #3b82f6;'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td style="padding: 16px; color: var(--text-tertiary); font-size: 13px;">
                      {new Date(user.created_at).toLocaleString()}
                    </td>
                    <td style="padding: 16px;">
                      <div style="display: flex; gap: 8px; justify-content: center;">
                        <button
                          onClick$={() => editingUser.value = user}
                          style="padding: 8px 16px; background: var(--accent-secondary); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                          onMouseOver$={(e) => {
                            const el = e.target as HTMLElement;
                            if (el) {
                              el.style.background = "var(--accent-secondary-hover)";
                              el.style.transform = "translateY(-1px)";
                            }
                          }}
                          onMouseOut$={(e) => {
                            const el = e.target as HTMLElement;
                            if (el) {
                              el.style.background = "var(--accent-secondary)";
                              el.style.transform = "translateY(0)";
                            }
                          }}
                        >
                          Edit
                        </button>
                        <Form action={deleteUserAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            style="padding: 8px 16px; background: var(--error); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                            onMouseOver$={(e) => {
                              const el = e.target as HTMLElement;
                              if (el) {
                                el.style.background = "#dc2626";
                                el.style.transform = "translateY(-1px)";
                              }
                            }}
                            onMouseOut$={(e) => {
                              const el = e.target as HTMLElement;
                              if (el) {
                                el.style.background = "var(--error)";
                                el.style.transform = "translateY(0)";
                              }
                            }}
                            onClick$={(e) => {
                              if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) {
                                e.preventDefault();
                              }
                            }}
                          >
                            Delete
                          </button>
                        </Form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser.value && (
        <div 
          style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px;"
          onClick$={(e) => {
            if (e.target === e.currentTarget) {
              editingUser.value = null;
            }
          }}
        >
          <div style="background: var(--bg-secondary); padding: 32px; border-radius: 12px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
              <h2 style="margin: 0; font-size: 24px; color: var(--text-primary); font-weight: 600;">Edit User</h2>
              <button
                onClick$={() => editingUser.value = null}
                style="background: none; border: none; font-size: 24px; color: var(--text-secondary); cursor: pointer; padding: 4px 8px; line-height: 1; transition: color 0.2s;"
                onMouseOver$={(e) => {
                  const el = e.target as HTMLElement;
                  if (el) el.style.color = "var(--text-primary)";
                }}
                onMouseOut$={(e) => {
                  const el = e.target as HTMLElement;
                  if (el) el.style.color = "var(--text-secondary)";
                }}
              >
                ×
              </button>
            </div>

            <Form action={updateUserAction} style="display: flex; flex-direction: column; gap: 20px;">
              <input type="hidden" name="id" value={editingUser.value.id} />

              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label for="edit_email" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Email:</label>
                <input
                  type="email"
                  id="edit_email"
                  name="email"
                  value={editingUser.value.email}
                  required
                  style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
                  onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
                  onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                />
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label for="edit_username" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Username:</label>
                <input
                  type="text"
                  id="edit_username"
                  name="username"
                  value={editingUser.value.username}
                  required
                  style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
                  onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
                  onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <label for="edit_first_name" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">First Name:</label>
                  <input
                    type="text"
                    id="edit_first_name"
                    name="first_name"
                    value={editingUser.value.first_name}
                    style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
                    onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-secondary)"}
                    onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                  />
                </div>

                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <label for="edit_last_name" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Last Name:</label>
                  <input
                    type="text"
                    id="edit_last_name"
                    name="last_name"
                    value={editingUser.value.last_name}
                    style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s;"
                    onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-secondary)"}
                    onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                  />
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 8px;">
                <label for="edit_role" style="font-weight: 500; color: var(--text-primary); font-size: 14px;">Role:</label>
                <select
                  id="edit_role"
                  name="role"
                  value={editingUser.value.role}
                  style="padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; background: var(--bg-tertiary); color: var(--text-primary); transition: border-color 0.2s; cursor: pointer;"
                  onFocus$={(e) => (e.target as HTMLElement).style.borderColor = "var(--accent-primary)"}
                  onBlur$={(e) => (e.target as HTMLElement).style.borderColor = "var(--border-color)"}
                >
                  <option value="user">User</option>
                  <option value="developer">Developer</option>
                </select>
              </div>

              <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px;">
                <button
                  type="button"
                  onClick$={() => editingUser.value = null}
                  style="padding: 12px 24px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                  onMouseOver$={(e) => {
                    const el = e.target as HTMLElement;
                    if (el) el.style.background = "var(--bg-elevated)";
                  }}
                  onMouseOut$={(e) => {
                    const el = e.target as HTMLElement;
                    if (el) el.style.background = "var(--bg-tertiary)";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style="padding: 12px 28px; background: var(--accent-gradient); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.2s;"
                  onMouseOver$={(e) => {
                    const el = e.target as HTMLElement;
                    if (el) {
                      el.style.transform = "translateY(-2px)";
                      el.style.boxShadow = "var(--shadow-accent)";
                    }
                  }}
                  onMouseOut$={(e) => {
                    const el = e.target as HTMLElement;
                    if (el) {
                      el.style.transform = "translateY(0)";
                      el.style.boxShadow = "var(--shadow-sm)";
                    }
                  }}
                  disabled={updateUserAction.isRunning}
                  onClick$={() => {
                    if (updateUserAction.value?.success) {
                      editingUser.value = null;
                    }
                  }}
                >
                  {updateUserAction.isRunning ? "Updating..." : "Update User"}
                </button>
              </div>

              {updateUserAction.value?.failed && (
                <div style="padding: 14px 18px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); border-radius: 8px; font-weight: 500;">
                  Error: {updateUserAction.value.message}
                </div>
              )}
            </Form>
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
