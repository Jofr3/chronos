import { component$, Slot, useSignal } from "@builder.io/qwik";
import { routeLoader$, Link, useLocation } from "@builder.io/qwik-city";
import type { AuthUser } from "@chronos/types/auth";
import { getApiBaseUrl } from "~/config/env";
import { LuUsers, LuPanelRightClose, LuPanelRightOpen, LuLogOut, LuUser } from "@qwikest/icons/lucide";

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
  const isCollapsed = useSignal(false);
  const showUserPopup = useSignal(false);
  const location = useLocation();

  return (
    <div class="app-layout">
      {/* Sidebar */}
      <aside class={`sidebar ${isCollapsed.value ? 'sidebar-collapsed' : ''}`}>
        {/* Collapse toggle button */}
        <button
          class="sidebar-toggle"
          onClick$={() => {
            isCollapsed.value = !isCollapsed.value;
          }}
          title={isCollapsed.value ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed.value ? <LuPanelRightOpen size={24} /> : <LuPanelRightClose size={24} />}
        </button>

        {/* Navigation */}
        <nav class="sidebar-nav">
          <ul class="sidebar-nav-list">
            <li>
              <Link
                href="/admin/users"
                class={`sidebar-nav-link ${location.url.pathname.startsWith('/admin/users') ? 'sidebar-nav-link-active' : ''}`}
              >
                <LuUsers size={20} />
                {!isCollapsed.value && <span>Users</span>}
              </Link>
            </li>
          </ul>
        </nav>

        {/* User menu at bottom */}
        <div class="sidebar-user-menu">
          <button
            class="sidebar-user-avatar"
            onClick$={() => {
              showUserPopup.value = !showUserPopup.value;
            }}
            title="User menu"
          >
            <LuUser size={20} />
          </button>

          {/* User popup */}
          {showUserPopup.value && (
            <>
              <div
                class="user-popup-backdrop"
                onClick$={() => {
                  showUserPopup.value = false;
                }}
              />
              <div class="user-popup">
                <div class="user-popup-email">
                  {authData.value.user?.email}
                </div>
                <div class="user-popup-role">
                  Developer
                </div>
                <a
                  href="/logout"
                  class="user-popup-logout-btn"
                >
                  <LuLogOut size={18} />
                  <span>Logout</span>
                </a>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <main class="main-content">
        <Slot />
      </main>
    </div>
  );
});
