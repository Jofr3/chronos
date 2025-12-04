import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useLogout = routeLoader$(async ({ redirect, cookie }) => {
  // Clear the auth cookie with the same path
  cookie.delete("chronos_auth_token", {
    path: "/",
  });

  // Also try setting it with expired date as fallback
  cookie.set("chronos_auth_token", "", {
    path: "/",
    maxAge: 0,
  });

  // Redirect to login
  throw redirect(302, "/login");
});

export default component$(() => {
  // This component shouldn't render as we redirect immediately
  useLogout();

  return (
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-primary);">
      <p style="color: var(--text-secondary); font-size: 16px;">
        Logging out...
      </p>
    </div>
  );
});
