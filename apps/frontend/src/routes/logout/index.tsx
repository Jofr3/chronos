import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useLogout = routeLoader$(async ({ redirect, cookie }) => {
  console.log("[Logout] Clearing cookie");
  
  // Clear the auth cookie with the same path
  cookie.delete("chronos_auth_token", {
    path: "/",
  });
  
  // Also try setting it with expired date as fallback
  cookie.set("chronos_auth_token", "", {
    path: "/",
    maxAge: 0,
  });
  
  console.log("[Logout] Cookie cleared, redirecting to login");
  
  // Redirect to login
  throw redirect(302, "/login");
});

export default component$(() => {
  // This component shouldn't render as we redirect immediately
  useLogout();
  
  return (
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <p>Logging out...</p>
    </div>
  );
});
