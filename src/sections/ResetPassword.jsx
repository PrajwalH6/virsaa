
import React, { useEffect, useState } from "react";
import { supabase, configured } from "../lib/supabase";
import "./Admin.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      setMessage("Supabase is not configured.");
      return;
    }

    let active = true;
    let recoveryVerified = false;

    const params = new URLSearchParams(
      window.location.search
    );

    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );

    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type =
      params.get("type") ||
      hashParams.get("type");

    const authError =
      params.get("error_description") ||
      hashParams.get("error_description");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event) => {
        if (!active) return;

        if (event === "PASSWORD_RECOVERY") {
          recoveryVerified = true;
          setReady(true);
          setChecking(false);
          setMessage("");
        }
      }
    );

    async function initializeRecovery() {
      if (authError) {
        if (active) {
          setMessage(
            decodeURIComponent(authError)
          );
          setChecking(false);
        }
        return;
      }

      try {
        if (tokenHash && type === "recovery") {
          const { error } =
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            });

          if (error) throw error;

          recoveryVerified = true;
        } else if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(
              code
            );

          if (error) throw error;

          // The code exchange alone does not prove
          // that this was a recovery link.
          // Supabase's PASSWORD_RECOVERY event
          // is required for the PKCE flow.
        } else if (
          type === "recovery" &&
          hashParams.has("access_token")
        ) {
          // Supabase automatically processes
          // the recovery URL and emits
          // PASSWORD_RECOVERY.
        } else {
          if (active) {
            setMessage(
              "Open the password recovery link sent to your email."
            );
            setChecking(false);
          }
          return;
        }

        if (!active) return;

        if (recoveryVerified) {
          setReady(true);
          setChecking(false);

          window.history.replaceState(
            {},
            "",
            "/admin/reset-password"
          );
        } else {
          // Allow the auth listener to receive
          // the PASSWORD_RECOVERY event.
          // If it is not emitted, do not grant
          // recovery access merely from a session.
          setChecking(false);
          setMessage(
            "Recovery verification was not completed. Please request a new password reset link."
          );
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setReady(false);
          setChecking(false);
          setMessage(
            "The recovery link is invalid or expired. Please request a new one."
          );
        }
      }
    }

    initializeRecovery();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleReset(e) {
    e.preventDefault();

    if (!ready || !supabase) return;

    setMessage("");

    if (password.length < 12) {
      setMessage(
        "Your password must contain at least 12 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) throw error;

      setSuccess(true);
      setReady(false);
      setPassword("");
      setConfirmPassword("");

      await supabase.auth.signOut();

      setMessage(
        "Your password has been updated successfully. You can now sign in."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Unable to update password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/">← VriSaa Café</a>
        <h1>Admin Password Recovery</h1>
      </header>

      <section className="admin-login">
        <h2>Create New Password</h2>

        {!configured ? (
          <p>Supabase is not configured.</p>
        ) : checking ? (
          <p>Verifying recovery link...</p>
        ) : ready && !success ? (
          <form onSubmit={handleReset}>
            <label>
              New Password
              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>

            <label>
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
                minLength={12}
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Updating Password..."
                : "Update Password"}
            </button>
          </form>
        ) : null}

        {message && (
          <p role="status" className="admin-message">
            {message}
          </p>
        )}

        <a href="/admin">
          Back to Admin Login
        </a>
      </section>
    </main>
  );
}
