import { component$, useVisibleTask$ } from "@builder.io/qwik";
import {
  routeAction$,
  Form,
  zod$,
  z,
  Link,
  useNavigate,
} from "@builder.io/qwik-city";
import type { DocumentHead } from "@builder.io/qwik-city";
import type { ApiResponse, ApiError } from "@chronos/types/api";
import type { AuthResponse } from "@chronos/types/auth";
import { getApiBaseUrl } from "~/config/env";

interface ApiErrorResponse {
  data: null;
  success: false;
  message: string;
  error: ApiError;
}

export const useLogin = routeAction$(
  async (data, { fail, cookie }) => {
    try {
      const apiUrl = getApiBaseUrl();

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result: ApiResponse<AuthResponse> | ApiErrorResponse =
        await response.json();

      if (!response.ok || !result.success) {
        const errorData = result as ApiErrorResponse;
        return fail(400, {
          message:
            errorData.error?.message || errorData.message || "Login failed",
        });
      }

      const authData = (result as ApiResponse<AuthResponse>).data!;

      // Set the auth token as a cookie
      cookie.set("chronos_auth_token", authData.token, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Return success - will handle redirect client-side
      return {
        success: true,
        redirectTo: "/tasks",
      };
    } catch (error) {
      // Check if it's a redirect (don't catch those)
      if (error && typeof error === "object" && "status" in error) {
        throw error;
      }
      return fail(400, {
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  },
  zod$({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  }),
);

export default component$(() => {
  const loginAction = useLogin();
  const nav = useNavigate();

  // Handle client-side redirect after successful login
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const value = track(() => loginAction.value);
    if (value?.success && value?.redirectTo) {
      nav(value.redirectTo);
    }
  });

  return (
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); position: relative; overflow: hidden;">
      {/* Background decoration */}
      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 50%, rgba(255, 68, 68, 0.15) 0%, transparent 50%);"></div>
      <div style="position: absolute; bottom: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 70% 50%, rgba(255, 136, 51, 0.15) 0%, transparent 50%);"></div>

      <div style="width: 100%; max-width: 440px; padding: 48px; background: var(--bg-secondary); border-radius: 16px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); position: relative; z-index: 1;">
        <div style="text-align: center; margin-bottom: 36px;">
          <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Chronos
          </h1>
          <p style="margin: 0; color: var(--text-secondary); font-size: 15px;">
            Welcome back! Sign in to continue
          </p>
        </div>

        <Form
          action={loginAction}
          style="display: flex; flex-direction: column; gap: 24px;"
        >
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label
              for="email"
              style="font-weight: 600; font-size: 14px; color: var(--text-primary);"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              style="padding: 14px 16px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-tertiary); color: var(--text-primary); outline: none; transition: all 0.2s;"
              onFocus$={(e) => {
                (e.target as HTMLElement).style.borderColor =
                  "var(--accent-primary)";
                (e.target as HTMLElement).style.boxShadow =
                  "0 0 0 3px rgba(255, 68, 68, 0.1)";
              }}
              onBlur$={(e) => {
                (e.target as HTMLElement).style.borderColor =
                  "var(--border-color)";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
              placeholder="you@example.com"
            />
            {loginAction.value?.fieldErrors?.email && (
              <span style="color: var(--error); font-size: 13px; font-weight: 500;">
                {loginAction.value.fieldErrors.email}
              </span>
            )}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label
              for="password"
              style="font-weight: 600; font-size: 14px; color: var(--text-primary);"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              style="padding: 14px 16px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-tertiary); color: var(--text-primary); outline: none; transition: all 0.2s;"
              onFocus$={(e) => {
                (e.target as HTMLElement).style.borderColor =
                  "var(--accent-primary)";
                (e.target as HTMLElement).style.boxShadow =
                  "0 0 0 3px rgba(255, 68, 68, 0.1)";
              }}
              onBlur$={(e) => {
                (e.target as HTMLElement).style.borderColor =
                  "var(--border-color)";
                (e.target as HTMLElement).style.boxShadow = "none";
              }}
              placeholder="Enter your password"
            />
            {loginAction.value?.fieldErrors?.password && (
              <span style="color: var(--error); font-size: 13px; font-weight: 500;">
                {loginAction.value.fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            style="padding: 14px 24px; background: var(--accent-gradient); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.3s; margin-top: 8px;"
            onMouseOver$={(e) => {
              (e.target as HTMLElement).style.transform = "translateY(-2px)";
              (e.target as HTMLElement).style.boxShadow =
                "var(--shadow-accent)";
            }}
            onMouseOut$={(e) => {
              (e.target as HTMLElement).style.transform = "translateY(0)";
              (e.target as HTMLElement).style.boxShadow = "var(--shadow-sm)";
            }}
            disabled={loginAction.isRunning}
          >
            {loginAction.isRunning ? "Signing in..." : "Sign In"}
          </button>
        </Form>

        {loginAction.value?.failed && (
          <div style="margin-top: 24px; padding: 14px 18px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); border-radius: 10px; text-align: center; font-weight: 500;">
            {loginAction.value.message}
          </div>
        )}

        <div style="margin-top: 32px; text-align: center; font-size: 14px; color: var(--text-secondary);">
          Don't have an account?{" "}
          <Link
            href="/signup"
            style="color: var(--accent-secondary); text-decoration: none; font-weight: 600; transition: color 0.2s;"
            onMouseOver$={(e) =>
              ((e.target as HTMLElement).style.color =
                "var(--accent-secondary-hover)")
            }
            onMouseOut$={(e) =>
              ((e.target as HTMLElement).style.color =
                "var(--accent-secondary)")
            }
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Login - Chronos",
  meta: [
    {
      name: "description",
      content: "Login to your Chronos account",
    },
  ],
};
