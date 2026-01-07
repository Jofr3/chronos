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
    <div class="redirect-container">
      <p class="redirect-text">
        Logging out...
      </p>
    </div>
  );
});
