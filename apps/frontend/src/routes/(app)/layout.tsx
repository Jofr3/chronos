import { component$, Slot, useSignal } from "@builder.io/qwik";
import { routeLoader$, Link, useLocation } from "@builder.io/qwik-city";
import type { AuthUser } from "@chronos/types/auth";
import { getApiBaseUrl } from "~/config/env";
import { LuCheckSquare, LuCalendar, LuPanelRightClose, LuPanelRightOpen, LuLogOut, LuUser } from "@qwikest/icons/lucide";

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
                href="/tasks"
                class={`sidebar-nav-link ${location.url.pathname.startsWith('/tasks') ? 'sidebar-nav-link-active' : ''}`}
              >
                <LuCheckSquare size={20} />
                {!isCollapsed.value && <span>Tasks</span>}
              </Link>
            </li>
            <li>
              <Link
                href="/calendars"
                class={`sidebar-nav-link ${location.url.pathname.startsWith('/calendars') ? 'sidebar-nav-link-active' : ''}`}
              >
                <LuCalendar size={20} />
                {!isCollapsed.value && <span>Calendar</span>}
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
