import { component$, Slot, useSignal } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
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
  const showUserPopup = useSignal(false);

  return (
    <div class="dash-dashboard" style={{ position: "relative" }}>
      {/* User Menu */}
      <div class="dash-user-menu">
        <button
          class="dash-user-btn"
          onClick$={() => {
            showUserPopup.value = !showUserPopup.value;
          }}
          title="User menu"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>

        {showUserPopup.value && (
          <>
            <div
              style={{ position: "fixed", inset: 0, background: "transparent", zIndex: 49 }}
              onClick$={() => {
                showUserPopup.value = false;
              }}
            />
            <div class="dash-user-popup">
              <div class="dash-user-popup-email">
                {authData.value.user?.email}
              </div>
              <a href="/logout" class="dash-user-popup-logout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                <span>Logout</span>
              </a>
            </div>
          </>
        )}
      </div>

      <Slot />
    </div>
  );
});
