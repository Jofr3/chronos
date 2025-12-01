import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { useAuthCheck } from "../layout";

export default component$(() => {
  const authData = useAuthCheck();

  return (
    <div>
      <h1 style="margin-top: 0; font-size: 36px; color: var(--text-primary); font-weight: 700;">
        Welcome to Chronos
      </h1>
      
      <div style="background: var(--bg-secondary); padding: 28px; border-radius: 12px; box-shadow: var(--shadow-md); margin-top: 28px; border: 1px solid var(--border-color);">
        <h2 style="margin-top: 0; font-size: 22px; color: var(--text-primary); font-weight: 600;">
          Hello, <span style="background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">{authData.value.user?.email}</span>!
        </h2>
        <p style="color: var(--text-secondary); line-height: 1.7; font-size: 15px; margin: 0;">
          This is your home page. You can customize this content to show a dashboard,
          recent activity, or any other relevant information.
        </p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 28px;">
        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); transition: all 0.3s;"
          onMouseOver$={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-accent)";
          }}
          onMouseOut$={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
          }}
        >
          <div style="width: 48px; height: 48px; background: var(--accent-gradient); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 24px;">
            ⚡
          </div>
          <h3 style="margin: 0 0 12px 0; font-size: 18px; color: var(--text-primary); font-weight: 600;">Quick Actions</h3>
          <p style="color: var(--text-secondary); font-size: 14px; margin: 0; line-height: 1.6;">
            Manage your tasks, users and settings from the sidebar navigation.
          </p>
        </div>

        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); transition: all 0.3s;"
          onMouseOver$={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-secondary)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(255, 136, 51, 0.3)";
          }}
          onMouseOut$={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
          }}
        >
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ff8833 0%, #ffaa44 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 24px;">
            🚀
          </div>
          <h3 style="margin: 0 0 12px 0; font-size: 18px; color: var(--text-primary); font-weight: 600;">Getting Started</h3>
          <p style="color: var(--text-secondary); font-size: 14px; margin: 0; line-height: 1.6;">
            Explore the application features and customize your experience.
          </p>
        </div>

        <div style="background: var(--bg-secondary); padding: 24px; border-radius: 12px; box-shadow: var(--shadow-md); border: 1px solid var(--border-color); transition: all 0.3s;"
          onMouseOver$={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-primary)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-accent)";
          }}
          onMouseOut$={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
          }}
        >
          <div style="width: 48px; height: 48px; background: var(--accent-gradient); border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 24px;">
            💡
          </div>
          <h3 style="margin: 0 0 12px 0; font-size: 18px; color: var(--text-primary); font-weight: 600;">Need Help?</h3>
          <p style="color: var(--text-secondary); font-size: 14px; margin: 0; line-height: 1.6;">
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
