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

export const useSignup = routeAction$(
  async (data, { fail, cookie }) => {
    try {
      // Validate passwords match
      if (data.password !== data.confirmPassword) {
        return fail(400, {
          message: "Passwords do not match",
        });
      }

      const response = await fetch(`${getApiBaseUrl()}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          username: data.username,
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
        }),
      });

      const result: ApiResponse<AuthResponse> | ApiErrorResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorData = result as ApiErrorResponse;
        return fail(400, {
          message: errorData.error?.message || errorData.message || "Signup failed",
        });
      }

      const authData = (result as ApiResponse<AuthResponse>).data;

      // Set the auth token as a cookie
      cookie.set("chronos_auth_token", authData.token, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

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
      return fail(400, {
        message: error instanceof Error ? error.message : "Signup failed",
      });
    }
  },
  zod$({
    email: z.string().email("Invalid email format"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
);

export default component$(() => {
  const signupAction = useSignup();
  const nav = useNavigate();

  // Handle client-side redirect after successful signup
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const value = track(() => signupAction.value);
    if (value?.success && value?.redirectTo) {
      nav(value.redirectTo);
    }
  });

  return (
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
      <div style="width: 100%; max-width: 400px; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 30px 0; text-align: center; font-size: 24px; color: #333;">
          Create an Account
        </h1>

        <Form action={signupAction} style="display: flex; flex-direction: column; gap: 20px;">
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
            {signupAction.value?.fieldErrors?.email && (
              <span style="color: #dc2626; font-size: 12px;">
                {signupAction.value.fieldErrors.email}
              </span>
            )}
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="username" style="font-weight: 500; font-size: 14px; color: #333;">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.2s;"
              placeholder="johndoe"
            />
            {signupAction.value?.fieldErrors?.username && (
              <span style="color: #dc2626; font-size: 12px;">
                {signupAction.value.fieldErrors.username}
              </span>
            )}
          </div>

          <div style="display: flex; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
              <label for="firstName" style="font-weight: 500; font-size: 14px; color: #333;">
                First Name <span style="color: #999; font-weight: 400;">(optional)</span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.2s;"
                placeholder="John"
              />
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
              <label for="lastName" style="font-weight: 500; font-size: 14px; color: #333;">
                Last Name <span style="color: #999; font-weight: 400;">(optional)</span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.2s;"
                placeholder="Doe"
              />
            </div>
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
              placeholder="At least 8 characters"
            />
            {signupAction.value?.fieldErrors?.password && (
              <span style="color: #dc2626; font-size: 12px;">
                {signupAction.value.fieldErrors.password}
              </span>
            )}
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="confirmPassword" style="font-weight: 500; font-size: 14px; color: #333;">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              style="padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.2s;"
              placeholder="Confirm your password"
            />
            {signupAction.value?.fieldErrors?.confirmPassword && (
              <span style="color: #dc2626; font-size: 12px;">
                {signupAction.value.fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            style="padding: 12px 20px; background: #0070f3; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.2s;"
            disabled={signupAction.isRunning}
          >
            {signupAction.isRunning ? "Creating account..." : "Create Account"}
          </button>
        </Form>

        {signupAction.value?.failed && (
          <div style="margin-top: 20px; padding: 12px; background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; border-radius: 6px; text-align: center;">
            {signupAction.value.message}
          </div>
        )}

        <div style="margin-top: 24px; text-align: center; font-size: 14px; color: #666;">
          Already have an account?{" "}
          <Link href="/login" style="color: #0070f3; text-decoration: none; font-weight: 500;">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Sign Up - Chronos",
  meta: [
    {
      name: "description",
      content: "Create a new Chronos account",
    },
  ],
};
