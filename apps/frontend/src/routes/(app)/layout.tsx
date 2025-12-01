import { component$, Slot } from "@builder.io/qwik";
import { routeLoader$, Link } from "@builder.io/qwik-city";
import type { AuthUser } from "@chronos/types/auth";
import { getApiBaseUrl } from "~/config/env";

// Auth check for all pages in this layout
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

export default component$(() => {
  const authData = useAuthCheck();

  return (
    <div style="display: flex; height: 100vh; background: #f5f5f5; overflow: hidden;">
      {/* Sidebar */}
      <aside style="width: 250px; background: #1e293b; color: white; display: flex; flex-direction: column; flex-shrink: 0;">
        {/* Logo/Brand */}
        <div style="padding: 24px; border-bottom: 1px solid #334155;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Chronos</h1>
        </div>

        {/* Navigation */}
        <nav style="flex: 1; padding: 16px; overflow-y: auto;">
          <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px;">
            <li>
              <Link 
                href="/home" 
                style="display: block; padding: 12px 16px; border-radius: 6px; text-decoration: none; color: white; transition: background 0.2s;"
                onMouseOver$={(e) => (e.target as HTMLElement).style.background = "#334155"}
                onMouseOut$={(e) => (e.target as HTMLElement).style.background = "transparent"}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                href="/tasks" 
                style="display: block; padding: 12px 16px; border-radius: 6px; text-decoration: none; color: white; transition: background 0.2s;"
                onMouseOver$={(e) => (e.target as HTMLElement).style.background = "#334155"}
                onMouseOut$={(e) => (e.target as HTMLElement).style.background = "transparent"}
              >
                Tasks
              </Link>
            </li>
            <li>
              <Link 
                href="/users" 
                style="display: block; padding: 12px 16px; border-radius: 6px; text-decoration: none; color: white; transition: background 0.2s;"
                onMouseOver$={(e) => (e.target as HTMLElement).style.background = "#334155"}
                onMouseOut$={(e) => (e.target as HTMLElement).style.background = "transparent"}
              >
                Users
              </Link>
            </li>
          </ul>
        </nav>

        {/* User info at bottom */}
        <div style="padding: 16px; border-top: 1px solid #334155; flex-shrink: 0;">
          <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px;">
            {authData.value.user?.email}
          </div>
          <a 
            href="/logout" 
            style="display: inline-block; padding: 8px 16px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;"
          >
            Logout
          </a>
        </div>
      </aside>

      {/* Main content area */}
      <main style="flex: 1; padding: 24px; overflow-y: auto; min-width: 0;">
        <Slot />
      </main>
    </div>
  );
});
