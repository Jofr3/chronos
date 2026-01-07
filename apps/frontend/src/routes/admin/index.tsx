import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";

export const useRedirectToUsers = routeLoader$(async ({ redirect }) => {
  // Redirect /admin to /admin/users
  throw redirect(302, "/admin/users");
});

export default component$(() => {
  useRedirectToUsers();

  return (
    <div class="redirect-container">
      <p class="redirect-text">
        Redirecting...
      </p>
    </div>
  );
});
