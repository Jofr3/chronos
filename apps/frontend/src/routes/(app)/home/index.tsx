import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { useAuthCheck } from "../layout";

export default component$(() => {
  const authData = useAuthCheck();

  return (
    <div>
      <h1 style="margin-top: 0; font-size: 32px; color: #1e293b;">
        Welcome to Chronos
      </h1>
      
      <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-top: 24px;">
        <h2 style="margin-top: 0; font-size: 20px; color: #334155;">
          Hello, {authData.value.user?.email}!
        </h2>
        <p style="color: #64748b; line-height: 1.6;">
          This is your home page. You can customize this content to show a dashboard,
          recent activity, or any other relevant information.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-top: 24px;">
        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #334155;">Quick Actions</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            Manage your users and settings from the sidebar navigation.
          </p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #334155;">Getting Started</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            Explore the application features and customize your experience.
          </p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #334155;">Need Help?</h3>
          <p style="color: #64748b; font-size: 14px; margin: 0;">
            Check the documentation or contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Home - Chronos",
  meta: [
    {
      name: "description",
      content: "Chronos home page",
    },
  ],
};
