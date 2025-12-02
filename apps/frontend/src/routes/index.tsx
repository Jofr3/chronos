import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

export const useRedirect = routeLoader$(async ({ redirect, cookie }) => {
  const token = cookie.get("chronos_auth_token")?.value;
  
  if (token) {
    // User is logged in, redirect to tasks page
    throw redirect(302, "/tasks");
  } else {
    // User is not logged in, redirect to login
    throw redirect(302, "/login");
  }
});

export default component$(() => {
  useRedirect();
  
  return (
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-primary);">
      <p style="color: var(--text-secondary); font-size: 16px;">Redirecting...</p>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Chronos",
  meta: [
    {
      name: "description",
      content: "Chronos Application",
    },
  ],
};
