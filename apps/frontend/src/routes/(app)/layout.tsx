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
        "Authorization": `Bearer ${token}`,
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
    <div style="display: flex; height: 100vh; background: var(--bg-primary); overflow: hidden;">
      {/* Sidebar */}
      <aside style="width: 280px; background: var(--bg-secondary); display: flex; flex-direction: column; flex-shrink: 0; border-right: 1px solid var(--border-color);">
        {/* Logo/Brand */}
        <div style="padding: 32px 24px; border-bottom: 1px solid var(--border-color);">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Chronos
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: var(--text-tertiary); font-weight: 500; letter-spacing: 0.5px;">
            TIME MANAGEMENT
          </p>
        </div>

        {/* Navigation */}
        <nav style="flex: 1; padding: 24px 16px; overflow-y: auto;">
          <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px;">
            <li>
              <Link 
                href="/home" 
                style="display: flex; align-items: center; padding: 14px 16px; border-radius: 8px; text-decoration: none; color: var(--text-primary); font-weight: 500; transition: all 0.2s; border: 1px solid transparent;"
                onMouseOver$={(e) => {
                  (e.target as HTMLElement).style.background = "var(--bg-elevated)";
                  (e.target as HTMLElement).style.borderColor = "var(--border-color-light)";
                }}
                onMouseOut$={(e) => {
                  (e.target as HTMLElement).style.background = "transparent";
                  (e.target as HTMLElement).style.borderColor = "transparent";
                }}
              >
                <span style="margin-right: 12px; font-size: 18px;">🏠</span>
                Home
              </Link>
            </li>
            <li>
              <Link 
                href="/tasks" 
                style="display: flex; align-items: center; padding: 14px 16px; border-radius: 8px; text-decoration: none; color: var(--text-primary); font-weight: 500; transition: all 0.2s; border: 1px solid transparent;"
                onMouseOver$={(e) => {
                  (e.target as HTMLElement).style.background = "var(--bg-elevated)";
                  (e.target as HTMLElement).style.borderColor = "var(--border-color-light)";
                }}
                onMouseOut$={(e) => {
                  (e.target as HTMLElement).style.background = "transparent";
                  (e.target as HTMLElement).style.borderColor = "transparent";
                }}
              >
                <span style="margin-right: 12px; font-size: 18px;">✓</span>
                Tasks
              </Link>
            </li>
            <li>
              <Link 
                href="/users" 
                style="display: flex; align-items: center; padding: 14px 16px; border-radius: 8px; text-decoration: none; color: var(--text-primary); font-weight: 500; transition: all 0.2s; border: 1px solid transparent;"
                onMouseOver$={(e) => {
                  (e.target as HTMLElement).style.background = "var(--bg-elevated)";
                  (e.target as HTMLElement).style.borderColor = "var(--border-color-light)";
                }}
                onMouseOut$={(e) => {
                  (e.target as HTMLElement).style.background = "transparent";
                  (e.target as HTMLElement).style.borderColor = "transparent";
                }}
              >
                <span style="margin-right: 12px; font-size: 18px;">👥</span>
                Users
              </Link>
            </li>
          </ul>
        </nav>

        {/* User info at bottom */}
        <div style="padding: 20px; border-top: 1px solid var(--border-color); flex-shrink: 0; background: var(--bg-tertiary);">
          <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {authData.value.user?.email}
          </div>
          <a 
            href="/logout" 
            style="display: block; text-align: center; padding: 10px 16px; background: var(--accent-primary); color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; transition: all 0.2s; box-shadow: var(--shadow-sm);"
            onMouseOver$={(e) => {
              (e.target as HTMLElement).style.background = "var(--accent-primary-hover)";
              (e.target as HTMLElement).style.transform = "translateY(-1px)";
              (e.target as HTMLElement).style.boxShadow = "var(--shadow-accent)";
            }}
            onMouseOut$={(e) => {
              (e.target as HTMLElement).style.background = "var(--accent-primary)";
              (e.target as HTMLElement).style.transform = "translateY(0)";
              (e.target as HTMLElement).style.boxShadow = "var(--shadow-sm)";
            }}
          >
            Logout
          </a>
        </div>
      </aside>

      {/* Main content area */}
      <main style="flex: 1; padding: 32px; overflow-y: auto; min-width: 0;">
        <Slot />
      </main>
    </div>
  );
});
