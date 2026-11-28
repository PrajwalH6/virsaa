
import React, { useEffect, useRef, useState } from "react";
import { supabase, configured } from "../lib/supabase";
import { verifyRecovery } from "../lib/recovery";
import "./Admin.css";

const recoveryController = new AbortController();
const isRecoveryPage = window.location.pathname.replace(/\/$/, "") === "/admin/reset-password";
const recoveryVerification = supabase && isRecoveryPage
  ? verifyRecovery(supabase.auth, window.location.href, { signal: recoveryController.signal })
    .then((session) => ({ session }), (error) => ({ error }))
  : null;

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [recoveryUser, setRecoveryUser] = useState(null);
  const effectVersion = useRef(0);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!recoveryVerification) {
      setChecking(false);
      return;
    }

    const version = ++effectVersion.current;
    let active = true;
    recoveryVerification.then(({ session, error }) => {
      if (!active) return;
      if (error) {
        setMessage(error.message);
      } else {
        setRecoveryUser(session.user.id);
        window.history.replaceState({}, "", "/admin/reset-password");
      }
      setChecking(false);
    });

    return () => {
      active = false;
      // React can immediately replay the effect in development.
      queueMicrotask(() => {
        if (effectVersion.current === version) recoveryController.abort();
      });
    };
  }, []);

  async function handleReset(e) {
    e.preventDefault();

    if (!recoveryUser || !supabase) return;

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.id !== recoveryUser) {
        setRecoveryUser(null);
        setMessage("Recovery session lost. Please request another link.");
        return;
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) throw error;

      setSuccess(true);
      setRecoveryUser(null);
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
        ) : recoveryUser && !success ? (
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
