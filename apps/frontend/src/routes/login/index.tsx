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
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="auth-title">
            Chronos
          </h1>
          <p class="auth-subtitle">
            Welcome back! Sign in to continue
          </p>
        </div>

        <Form
          action={loginAction}
          class="auth-form"
        >
          <div class="auth-field">
            <label
              for="email"
              class="auth-label"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              class="auth-input"
              placeholder="you@example.com"
            />
            {loginAction.value?.fieldErrors?.email && (
              <span class="auth-error">
                {loginAction.value.fieldErrors.email}
              </span>
            )}
          </div>

          <div class="auth-field">
            <label
              for="password"
              class="auth-label"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              class="auth-input"
              placeholder="Enter your password"
            />
            {loginAction.value?.fieldErrors?.password && (
              <span class="auth-error">
                {loginAction.value.fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            class="auth-submit-btn"
            disabled={loginAction.isRunning}
          >
            {loginAction.isRunning ? "Signing in..." : "Sign In"}
          </button>
        </Form>

        {loginAction.value?.failed && (
          <div class="failed-message">
            {loginAction.value.message}
          </div>
        )}

        <div class="auth-footer">
          Don't have an account?{" "}
          <Link
            href="/signup"
            class="auth-link"
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
