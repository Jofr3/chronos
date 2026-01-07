import { component$, useSignal } from "@builder.io/qwik";
import {
  routeLoader$,
  routeAction$,
  Form,
  zod$,
  z,
} from "@builder.io/qwik-city";
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
      error: error instanceof Error ? error.message : "Failed to load users",
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
        message:
          error instanceof Error ? error.message : "Failed to create user",
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
  }),
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
        message:
          error instanceof Error ? error.message : "Failed to update user",
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
  }),
);

export const useDeleteUser = routeAction$(
  async (data, { fail }) => {
    try {
      await userService.deleteUser(data.id);
      return { success: true };
    } catch (error) {
      return fail(400, {
        message:
          error instanceof Error ? error.message : "Failed to delete user",
      });
    }
  },
  zod$({
    id: z.string(),
  }),
);

export default component$(() => {
  const usersSignal = useUsers();
  const createUserAction = useCreateUser();
  const updateUserAction = useUpdateUser();
  const deleteUserAction = useDeleteUser();
  const editingUser = useSignal<User | null>(null);

  return (
    <div>
      <h1 class="admin-page-title">
        Users
      </h1>

      {/* Create User Form */}
      <div class="create-user-section">
        <h2 class="create-user-title">
          Create New User
        </h2>

        <Form action={createUserAction} class="create-user-form">
          <div class="admin-form-field">
            <label for="email" class="admin-form-label">
              Email:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="admin-form-input"
              placeholder="user@example.com"
            />
          </div>

          <div class="admin-form-field">
            <label for="username" class="admin-form-label">
              Username:
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              class="admin-form-input"
              placeholder="johndoe"
            />
          </div>

          <div class="admin-form-field">
            <label for="password" class="admin-form-label">
              Password:
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              class="admin-form-input"
              placeholder="At least 8 characters"
            />
            {createUserAction.value?.fieldErrors?.password && (
              <span class="auth-error">
                {createUserAction.value.fieldErrors.password}
              </span>
            )}
          </div>

          <div class="admin-form-field grid">
            <div class="admin-form-field">
              <label
                for="first_name"
                class="admin-form-label"
              >
                First Name{" "}
                <span class="admin-optional-text">
                  (optional)
                </span>
                :
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                class="admin-form-input secondary"
                placeholder="John"
              />
            </div>

            <div class="admin-form-field">
              <label
                for="last_name"
                class="admin-form-label"
              >
                Last Name{" "}
                <span class="admin-optional-text">
                  (optional)
                </span>
                :
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                class="admin-form-input secondary"
                placeholder="Doe"
              />
            </div>
          </div>

          <div class="admin-form-field">
            <label
              for="role"
              class="admin-form-label"
            >
              Role:
            </label>
            <select
              id="role"
              name="role"
              class="admin-form-select"
            >
              <option value="user">User</option>
              <option value="developer">Developer</option>
            </select>
          </div>

          <button
            type="submit"
            class="admin-submit-btn"
            disabled={createUserAction.isRunning}
          >
            {createUserAction.isRunning ? "Creating..." : "Create User"}
          </button>
        </Form>

        {createUserAction.value?.success && (
          <div class="success-message">
            User created successfully!
          </div>
        )}

        {createUserAction.value?.failed && (
          <div class="failed-message">
            Error: {createUserAction.value.message}
          </div>
        )}
      </div>

      {/* Error loading users */}
      {usersSignal.value.error && (
        <div class="error-message">
          Error: {usersSignal.value.error}
        </div>
      )}

      {/* Empty state */}
      {usersSignal.value.users.length === 0 && !usersSignal.value.error && (
        <div class="admin-empty-state">
          <div class="admin-empty-icon">👥</div>
          <div class="admin-empty-title">
            No users found
          </div>
          <div class="admin-empty-subtitle">
            Create your first user above to get started.
          </div>
        </div>
      )}

      {/* Users table */}
      {usersSignal.value.users.length > 0 && (
        <div class="users-table-section">
          <div class="users-table-header">
            <h3 class="users-table-title">
              All Users
            </h3>
            <span class="users-count-badge">
              {usersSignal.value.users.length}{" "}
              {usersSignal.value.users.length === 1 ? "user" : "users"}
            </span>
          </div>
          <div class="users-table-wrapper">
            <table class="users-table">
              <thead>
                <tr>
                  <th>
                    ID
                  </th>
                  <th>
                    Username
                  </th>
                  <th>
                    Email
                  </th>
                  <th>
                    First Name
                  </th>
                  <th>
                    Last Name
                  </th>
                  <th>
                    Role
                  </th>
                  <th>
                    Created At
                  </th>
                  <th>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {usersSignal.value.users.map((user) => (
                  <tr
                    key={user.id}
                  >
                    <td class="user-id">
                      {user.id}
                    </td>
                    <td class="user-username">
                      {user.username}
                    </td>
                    <td class="user-email">
                      {user.email}
                    </td>
                    <td class="user-name">
                      {user.first_name || "-"}
                    </td>
                    <td class="user-name">
                      {user.last_name || "-"}
                    </td>
                    <td>
                      <span
                        class={`user-role-badge ${user.role === "developer" ? 'developer' : 'user'}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td class="user-created-at">
                      {new Date(user.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div class="user-actions">
                        <button
                          onClick$={() => (editingUser.value = user)}
                          class="user-edit-btn"
                        >
                          Edit
                        </button>
                        <Form action={deleteUserAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            class="user-delete-btn"
                            onClick$={(e) => {
                              if (
                                !confirm(
                                  `Are you sure you want to delete user "${user.username}"?`,
                                )
                              ) {
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
          class="edit-modal-overlay"
          onClick$={(e) => {
            if (e.target === e.currentTarget) {
              editingUser.value = null;
            }
          }}
        >
          <div class="edit-modal-content">
            <div class="edit-modal-header">
              <h2 class="edit-modal-title">
                Edit User
              </h2>
              <button
                onClick$={() => (editingUser.value = null)}
                class="edit-modal-close"
              >
                ×
              </button>
            </div>

            <Form
              action={updateUserAction}
              class="edit-modal-form"
            >
              <input type="hidden" name="id" value={editingUser.value.id} />

              <div class="admin-form-field">
                <label
                  for="edit_email"
                  class="admin-form-label"
                >
                  Email:
                </label>
                <input
                  type="email"
                  id="edit_email"
                  name="email"
                  value={editingUser.value.email}
                  required
                  class="admin-form-input"
                />
              </div>

              <div class="admin-form-field">
                <label
                  for="edit_username"
                  class="admin-form-label"
                >
                  Username:
                </label>
                <input
                  type="text"
                  id="edit_username"
                  name="username"
                  value={editingUser.value.username}
                  required
                  class="admin-form-input"
                />
              </div>

              <div class="admin-form-field grid">
                <div class="admin-form-field">
                  <label
                    for="edit_first_name"
                    class="admin-form-label"
                  >
                    First Name:
                  </label>
                  <input
                    type="text"
                    id="edit_first_name"
                    name="first_name"
                    value={editingUser.value.first_name}
                    class="admin-form-input secondary"
                  />
                </div>

                <div class="admin-form-field">
                  <label
                    for="edit_last_name"
                    class="admin-form-label"
                  >
                    Last Name:
                  </label>
                  <input
                    type="text"
                    id="edit_last_name"
                    name="last_name"
                    value={editingUser.value.last_name}
                    class="admin-form-input secondary"
                  />
                </div>
              </div>

              <div class="admin-form-field">
                <label
                  for="edit_role"
                  class="admin-form-label"
                >
                  Role:
                </label>
                <select
                  id="edit_role"
                  name="role"
                  value={editingUser.value.role}
                  class="admin-form-select"
                >
                  <option value="user">User</option>
                  <option value="developer">Developer</option>
                </select>
              </div>

              <div class="edit-modal-actions">
                <button
                  type="button"
                  onClick$={() => (editingUser.value = null)}
                  class="edit-modal-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="edit-modal-save"
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
                <div class="failed-message">
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
