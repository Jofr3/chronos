import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useRedirectToUsers = routeLoader$(async ({ redirect }) => {
  // Redirect /admin to /admin/users
  throw redirect(302, "/admin/users");
});

export default component$(() => {
  useRedirectToUsers();

  return (
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-primary);">
      <p style="color: var(--text-secondary); font-size: 16px;">
        Redirecting...
      </p>
    </div>
  );
});
