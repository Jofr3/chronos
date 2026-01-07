import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$, Link } from "@builder.io/qwik-city";
import type { AuthUser } from "@chronos/types/auth";
import { getApiBaseUrl } from "~/config/env";

// Auth check for developer pages - requires developer role
export const useAuthCheck = routeLoader$(async ({ redirect, cookie }) => {
  const token = cookie.get("chronos_auth_token")?.value;

  if (!token) {
    throw redirect(302, "/login");
  }

  let user: AuthUser;

  try {
    const apiUrl = getApiBaseUrl();
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      cookie.delete("chronos_auth_token");
      throw redirect(302, "/login");
    }

    const data = await response.json();
    if (!data.success) {
      cookie.delete("chronos_auth_token");
      throw redirect(302, "/login");
    }

    user = data.data as AuthUser;
  } catch (error) {
    // Re-throw redirects (they have a status property)
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }
    // For other errors, delete cookie and redirect to login
    cookie.delete("chronos_auth_token");
    throw redirect(302, "/login");
  }

  // Check if user has developer role - redirect to tasks if not
  // Default to 'user' if role is undefined (for users created before migration)
  const userRole = user.role || "user";

  if (userRole !== "developer") {
    // Don't delete the cookie - user is authenticated, just not a developer
    throw redirect(302, "/tasks");
  }

  return { user };
});

export default component$(() => {
  const authData = useAuthCheck();

  return (
    <div class="app-layout">
      {/* Sidebar */}
      <aside class="sidebar">
        {/* Logo/Brand */}
        <div class="sidebar-header">
          <h1 class="sidebar-logo">
            Chronos
          </h1>
          <p class="sidebar-subtitle">
            TIME MANAGEMENT
          </p>
        </div>

        {/* Navigation */}
        <nav class="sidebar-nav">
          <ul class="sidebar-nav-list">
            <li>
              <Link
                href="/admin/users"
                class="sidebar-nav-link"
              >
                Users
              </Link>
            </li>
          </ul>
        </nav>

        {/* User info at bottom */}
        <div class="sidebar-user-info">
          <div class="sidebar-user-email">
            {authData.value.user?.email}
          </div>
          <div class="sidebar-user-role">
            Developer
          </div>
          <a
            href="/logout"
            class="sidebar-logout-btn"
          >
            Logout
          </a>
        </div>
      </aside>

      {/* Main content area */}
      <main class="main-content">
        <Slot />
      </main>
    </div>
  );
});
