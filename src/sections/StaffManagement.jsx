
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./StaffManagement.css";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function callStaffFunction(payload) {
    const { data, error } = await supabase.functions.invoke(
      "manage-staff",
      { body: payload }
    );

    if (error) {
      const details = await error.context?.json?.()
        .catch(() => null);

      throw new Error(
        details?.error || error.message
      );
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    return data;
  }

  async function loadStaff() {
    try {
      const result = await callStaffFunction({
        action: "list",
      });

      setStaff(result.staff || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function inviteStaff(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await callStaffFunction({
        action: "invite",
        email: email.trim(),
        role,
      });

      setMessage(
        "Invitation requested successfully. " +
        "Ask the recipient to check their email."
      );

      setEmail("");
      await loadStaff();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeStaff(member) {
    if (
      !window.confirm(
        `Remove admin access for ${member.email}?`
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      await callStaffFunction({
        action: "remove",
        user_id: member.user_id,
      });

      await loadStaff();
      setMessage("Staff access removed.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="staff-management">
      <h2>Manage Café Administrators</h2>

      <p>
        Invite authorized staff using their email.
        Each person sets their own password privately.
      </p>

      <form onSubmit={inviteStaff}>
        <h3>Invite New Staff</h3>

        <label>
          Staff Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="manager@example.com"
            required
          />
        </label>

        <label>
          Staff Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="admin">Café Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Processing..." : "Send Invitation"}
        </button>
      </form>

      <h3>Authorized Staff</h3>

      <div className="staff-list">
        {staff.map((member) => (
          <div className="staff-item" key={member.user_id}>
            <div>
              <strong>{member.email}</strong>

              <p>
                {member.role === "super_admin"
                  ? "Super Admin"
                  : "Café Admin"}
              </p>

              <small>
                {member.confirmed
                  ? "Email verified"
                  : "Invitation pending"}
              </small>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => removeStaff(member)}
            >
              Remove Access
            </button>
          </div>
        ))}
      </div>

      {message && (
        <p className="staff-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
