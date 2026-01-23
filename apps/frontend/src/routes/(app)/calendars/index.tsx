import { component$ } from "@builder.io/qwik";
import { routeLoader$ } from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";

// Redirect to the unified dashboard at /tasks
export const useRedirect = routeLoader$(async ({ redirect }) => {
  throw redirect(302, "/tasks");
});

export default component$(() => {
  useRedirect();
  return null;
});

export const head: DocumentHead = {
  title: "Calendar - Chronos",
};
