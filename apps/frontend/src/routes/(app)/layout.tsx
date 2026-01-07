import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$, Link } from "@builder.io/qwik-city";
import type { AuthUser } from "@chronos/types/auth";
import { getApiBaseUrl } from "~/config/env";

// Auth check for all pages in this layout
export const useAuthCheck = routeLoader$(async ({ redirect, cookie }) => {
  const token = cookie.get("chronos_auth_token")?.value;

  if (!token) {
    throw redirect(302, "/login");
  }

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

    return { user: data.data as AuthUser };
  } catch (error) {
    if (error && typeof error === "object" && "status" in error) {
      throw error;
    }
    cookie.delete("chronos_auth_token");
    throw redirect(302, "/login");
  }
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
                href="/tasks"
                class="sidebar-nav-link"
              >
                Tasks
              </Link>
            </li>
            <li>
              <Link
                href="/calendars"
                class="sidebar-nav-link"
              >
                Calendar
              </Link>
            </li>
          </ul>
        </nav>

        {/* User info at bottom */}
        <div class="sidebar-user-info">
          <div class="sidebar-user-email">
            {authData.value.user?.email}
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
