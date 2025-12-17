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
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); position: relative; overflow: hidden; padding: 24px;">
      {/* Success Popup */}
      {showSuccessPopup.value && (
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: popupOverlayIn 0.3s ease-out;">
          <div style="background: var(--bg-secondary); padding: 32px 48px; border-radius: 16px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); text-align: center; animation: popupIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
            <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; animation: checkmarkIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: var(--text-primary);">
              Account Created!
            </h2>
            <p style="margin: 0 0 24px 0; color: var(--text-secondary); font-size: 15px;">
              Your account has been created successfully.
            </p>
            <button
              onClick$={() => nav("/login")}
              style="padding: 12px 32px; background: var(--accent-gradient); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: var(--shadow-sm); transition: all 0.3s;"
              onMouseOver$={(e) => {
                (e.target as HTMLElement).style.transform = "translateY(-2px)";
                (e.target as HTMLElement).style.boxShadow = "var(--shadow-accent)";
              }}
              onMouseOut$={(e) => {
                (e.target as HTMLElement).style.transform = "translateY(0)";
                (e.target as HTMLElement).style.boxShadow = "var(--shadow-sm)";
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

      {/* Background decoration */}
      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 30% 50%, rgba(255, 68, 68, 0.15) 0%, transparent 50%);"></div>
      <div style="position: absolute; bottom: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 70% 50%, rgba(255, 136, 51, 0.15) 0%, transparent 50%);"></div>

      <div style="width: 100%; max-width: 480px; padding: 48px; background: var(--bg-secondary); border-radius: 16px; box-shadow: var(--shadow-lg); border: 1px solid var(--border-color); position: relative; z-index: 1;">
        <div style="text-align: center; margin-bottom: 36px;">
          <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700; background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            Join Chronos
          </h1>
          <p style="margin: 0; color: var(--text-secondary); font-size: 15px;">
            Create your account to get started
          </p>
        </div>

        <Form
          action={signupAction}
          style="display: flex; flex-direction: column; gap: 20px;"
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
            {signupAction.value?.fieldErrors?.email && (
              <span style="color: var(--error); font-size: 13px; font-weight: 500;">
                {signupAction.value.fieldErrors.email}
              </span>
            )}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label
              for="username"
              style="font-weight: 600; font-size: 14px; color: var(--text-primary);"
            >
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
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
              placeholder="johndoe"
            />
            {signupAction.value?.fieldErrors?.username && (
              <span style="color: var(--error); font-size: 13px; font-weight: 500;">
                {signupAction.value.fieldErrors.username}
              </span>
            )}
          </div>

          <div style="display: flex; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
              <label
                for="firstName"
                style="font-weight: 600; font-size: 14px; color: var(--text-primary);"
              >
                First Name{" "}
                <span style="color: var(--text-tertiary); font-weight: 400; font-size: 12px;">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                style="width: 100%; box-sizing: border-box; padding: 14px 16px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-tertiary); color: var(--text-primary); outline: none; transition: all 0.2s;"
                onFocus$={(e) => {
                  (e.target as HTMLElement).style.borderColor =
                    "var(--accent-secondary)";
                  (e.target as HTMLElement).style.boxShadow =
                    "0 0 0 3px rgba(255, 136, 51, 0.1)";
                }}
                onBlur$={(e) => {
                  (e.target as HTMLElement).style.borderColor =
                    "var(--border-color)";
                  (e.target as HTMLElement).style.boxShadow = "none";
                }}
                placeholder="John"
              />
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
              <label
                for="lastName"
                style="font-weight: 600; font-size: 14px; color: var(--text-primary);"
              >
                Last Name{" "}
                <span style="color: var(--text-tertiary); font-weight: 400; font-size: 12px;">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                style="width: 100%; box-sizing: border-box; padding: 14px 16px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 15px; background: var(--bg-tertiary); color: var(--text-primary); outline: none; transition: all 0.2s;"
                onFocus$={(e) => {
                  (e.target as HTMLElement).style.borderColor =
                    "var(--accent-secondary)";
                  (e.target as HTMLElement).style.boxShadow =
                    "0 0 0 3px rgba(255, 136, 51, 0.1)";
                }}
                onBlur$={(e) => {
                  (e.target as HTMLElement).style.borderColor =
                    "var(--border-color)";
                  (e.target as HTMLElement).style.boxShadow = "none";
                }}
                placeholder="Doe"
              />
            </div>
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
              placeholder="At least 8 characters"
            />
            {signupAction.value?.fieldErrors?.password && (
              <span style="color: var(--error); font-size: 13px; font-weight: 500;">
                {signupAction.value.fieldErrors.password}
              </span>
            )}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <label
              for="confirmPassword"
              style="font-weight: 600; font-size: 14px; color: var(--text-primary);"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
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
              placeholder="Confirm your password"
            />
            {signupAction.value?.fieldErrors?.confirmPassword && (
              <span style="color: var(--error); font-size: 13px; font-weight: 500;">
                {signupAction.value.fieldErrors.confirmPassword}
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
            disabled={signupAction.isRunning}
          >
            {signupAction.isRunning ? "Creating account..." : "Create Account"}
          </button>
        </Form>

        {signupAction.value?.failed && (
          <div style="margin-top: 24px; padding: 14px 18px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); border-radius: 10px; text-align: center; font-weight: 500;">
            {signupAction.value.message}
          </div>
        )}

        <div style="margin-top: 32px; text-align: center; font-size: 14px; color: var(--text-secondary);">
          Already have an account?{" "}
          <Link
            href="/login"
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
