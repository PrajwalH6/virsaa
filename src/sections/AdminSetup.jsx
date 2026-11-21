
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminSetup() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }

    async function checkSession() {
      // Supabase JS processes the invitation URL and
      // establishes a session when the link is valid.
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setChecking(false);
    }

    checkSession();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setChecking(false);
        }
      );

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (password.length < 12) {
      setMessage("Use at least 12 characters.");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setPassword("");
      setConfirm("");

      setMessage("Password created successfully.");

      await supabase.auth.signOut();

      window.location.replace("/admin");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <p>Verifying invitation...</p>;
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#edf1e6",
        padding: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          padding: 35,
          width: "100%",
          maxWidth: 420,
          display: "grid",
          gap: 15,
        }}
      >
        <h1>VriSaa Café</h1>
        <h2>Set Your Admin Password</h2>

        {!session ? (
          <p>
            Your invitation is invalid, expired, or
            has already been used. Contact the café
            owner for a new invitation.
          </p>
        ) : (
          <>
            <p>
              Signed in as {session.user.email}
            </p>

            <label htmlFor="new-password">
              New Password
            </label>

            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete="new-password"
              minLength={12}
              required
            />

            <label htmlFor="confirm-password">
              Confirm Password
            </label>

            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) =>
                setConfirm(e.target.value)
              }
              autoComplete="new-password"
              required
            />

            <button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Create Password"}
            </button>
          </>
        )}

        {message && (
          <p role="status">{message}</p>
        )}

        <a href="/admin">Return to Admin Login</a>
      </form>
    </main>
  );
}
