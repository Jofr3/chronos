import { component$, useVisibleTask$ } from "@builder.io/qwik";
import { routeAction$, Form, zod$, z, Link, useNavigate } from "@builder.io/qwik-city";
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
      console.log("[Login] Attempting login to:", `${apiUrl}/api/auth/login`);
      
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

      console.log("[Login] Response status:", response.status);

      const result: ApiResponse<AuthResponse> | ApiErrorResponse = await response.json();
      console.log("[Login] Response success:", result.success);

      if (!response.ok || !result.success) {
        const errorData = result as ApiErrorResponse;
        console.log("[Login] Login failed:", errorData.error?.message || errorData.message);
        return fail(400, {
          message: errorData.error?.message || errorData.message || "Login failed",
        });
      }

      const authData = (result as ApiResponse<AuthResponse>).data;
      console.log("[Login] Got token, length:", authData.token?.length);

      // Set the auth token as a cookie
      cookie.set("chronos_auth_token", authData.token, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      
      console.log("[Login] Cookie set successfully");

      // Return success - will handle redirect client-side
      return {
        success: true,
        redirectTo: "/users",
      };
    } catch (error) {
      // Check if it's a redirect (don't catch those)
      if (error && typeof error === "object" && "status" in error) {
        throw error;
      }
      console.log("[Login] Error:", error);
      return fail(400, {
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  },
  zod$({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  })
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
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
      <div style="width: 100%; max-width: 400px; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 30px 0; text-align: center; font-size: 24px; color: #333;">
          Login
        </h1>

        <Form action={loginAction} style="display: flex; flex-direction: column; gap: 20px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="email" style="font-weight: 500; font-size: 14px; color: #333;">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.2s;"
              placeholder="you@example.com"
            />
            {loginAction.value?.fieldErrors?.email && (
              <span style="color: #dc2626; font-size: 12px;">
                {loginAction.value.fieldErrors.email}
              </span>
            )}
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="password" style="font-weight: 500; font-size: 14px; color: #333;">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.2s;"
              placeholder="Enter your password"
            />
            {loginAction.value?.fieldErrors?.password && (
              <span style="color: #dc2626; font-size: 12px;">
                {loginAction.value.fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            style="padding: 12px 20px; background: #0070f3; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
            disabled={loginAction.isRunning}
          >
            {loginAction.isRunning ? "Signing in..." : "Sign In"}
          </button>
        </Form>

        {loginAction.value?.failed && (
          <div style="margin-top: 20px; padding: 12px; background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; border-radius: 6px; text-align: center;">
            {loginAction.value.message}
          </div>
        )}

        <div style="margin-top: 24px; text-align: center; font-size: 14px; color: #666;">
          Don't have an account?{" "}
          <Link href="/signup" style="color: #0070f3; text-decoration: none; font-weight: 500;">
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
