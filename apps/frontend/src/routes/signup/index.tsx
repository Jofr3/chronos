import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
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

export const useSignup = routeAction$(
  async (data, { fail }) => {
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

      const result: ApiResponse<AuthResponse> | ApiErrorResponse =
        await response.json();

      if (!response.ok || !result.success) {
        const errorData = result as ApiErrorResponse;
        return fail(400, {
          message:
            errorData.error?.message || errorData.message || "Signup failed",
        });
      }

      // Don't set the cookie - user needs to login after signup
      // Return success - will show alert and redirect to login
      return {
        success: true,
        redirectTo: "/login",
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
  }),
);

export default component$(() => {
  const signupAction = useSignup();
  const nav = useNavigate();
  const showSuccessPopup = useSignal(false);

  // Handle client-side redirect after successful signup
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const value = track(() => signupAction.value);
    if (value?.success && value?.redirectTo) {
      showSuccessPopup.value = true;
    }
  });

  return (
    <div class="auth-container signup">
      {/* Success Popup */}
      {showSuccessPopup.value && (
        <div class="success-popup-overlay">
          <div class="success-popup">
            <div class="success-checkmark">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 class="success-title">
              Account Created!
            </h2>
            <p class="success-message">
              Your account has been created successfully.
            </p>
            <button
              onClick$={() => nav("/login")}
              class="success-button"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      <div class="auth-card signup">
        <div class="auth-header">
          <h1 class="auth-title">
            Join Chronos
          </h1>
          <p class="auth-subtitle">
            Create your account to get started
          </p>
        </div>

        <Form
          action={signupAction}
          class="auth-form signup"
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
            {signupAction.value?.fieldErrors?.email && (
              <span class="auth-error">
                {signupAction.value.fieldErrors.email}
              </span>
            )}
          </div>

          <div class="auth-field">
            <label
              for="username"
              class="auth-label"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              class="auth-input"
              placeholder="johndoe"
            />
            {signupAction.value?.fieldErrors?.username && (
              <span class="auth-error">
                {signupAction.value.fieldErrors.username}
              </span>
            )}
          </div>

          <div class="auth-field row">
            <div>
              <label
                for="firstName"
                class="auth-label"
              >
                First Name{" "}
                <span class="auth-optional-label">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                class="auth-input secondary full-width"
                placeholder="John"
              />
            </div>

            <div>
              <label
                for="lastName"
                class="auth-label"
              >
                Last Name{" "}
                <span class="auth-optional-label">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                class="auth-input secondary full-width"
                placeholder="Doe"
              />
            </div>
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
              placeholder="At least 8 characters"
            />
            {signupAction.value?.fieldErrors?.password && (
              <span class="auth-error">
                {signupAction.value.fieldErrors.password}
              </span>
            )}
          </div>

          <div class="auth-field">
            <label
              for="confirmPassword"
              class="auth-label"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              required
              class="auth-input"
              placeholder="Confirm your password"
            />
            {signupAction.value?.fieldErrors?.confirmPassword && (
              <span class="auth-error">
                {signupAction.value.fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            class="auth-submit-btn"
            disabled={signupAction.isRunning}
          >
            {signupAction.isRunning ? "Creating account..." : "Create Account"}
          </button>
        </Form>

        {signupAction.value?.failed && (
          <div class="failed-message">
            {signupAction.value.message}
          </div>
        )}

        <div class="auth-footer">
          Already have an account?{" "}
          <Link
            href="/login"
            class="auth-link"
          >
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
