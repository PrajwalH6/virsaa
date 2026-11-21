
import React, { useEffect, useState, useCallback } from "react";
import { supabase, configured } from "../lib/supabase";
import StaffManagement from "./StaffManagement";
import "./Admin.css";

// -------------------------------------------
// WhatsApp confirmation messages
// -------------------------------------------

function buildWhatsAppMessage(booking) {
  const date = booking.booking_date;
  const time = booking.booking_time?.slice(0, 5);
  const guests = booking.guests;
  const reference = booking.id;

  const greeting = `Hello ${booking.customer_name}! 🌿`;

  if (booking.status === "confirmed") {
    return `${greeting}

Your table reservation at VriSaa Café has been CONFIRMED! ✅

📅 Date: ${date}
🕒 Time: ${time}
👥 Guests: ${guests}
🔖 Booking Reference: ${reference}

We look forward to welcoming you!

— Team VriSaa Café`;
  }

  if (booking.status === "rejected") {
    return `${greeting}

Thank you for choosing VriSaa Café.

Unfortunately, we are unable to accommodate your table reservation request.

📅 Requested Date: ${date}
🕒 Requested Time: ${time}
🔖 Booking Reference: ${reference}

Please contact us for another available time.

— Team VriSaa Café`;
  }

  if (booking.status === "cancelled") {
    return `${greeting}

Your table reservation at VriSaa Café has been cancelled.

📅 Date: ${date}
🕒 Time: ${time}
🔖 Booking Reference: ${reference}

Please contact us if you would like to make another reservation.

— Team VriSaa Café`;
  }

  return "";
}

function openWhatsApp(booking) {
  if (
    !["confirmed", "rejected", "cancelled"].includes(
      booking.status
    )
  ) {
    return;
  }

  const phone = String(booking.phone || "").replace(/\D/g, "");

  if (!/^[0-9]{10}$/.test(phone)) {
    alert("Customer phone number is invalid.");
    return;
  }

  const message = buildWhatsAppMessage(booking);

  const url =
    `https://wa.me/91${phone}?text=` +
    encodeURIComponent(message);

  window.open(url, "_blank", "noopener,noreferrer");
}

// -------------------------------------------
// Admin Dashboard
// -------------------------------------------

export default function Admin() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [staffRole, setStaffRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("reservations");

  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // -------------------------------------------
  // Authentication
  // -------------------------------------------

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (active) {
          setSession(newSession);
          setAuthLoading(false);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // -------------------------------------------
  // Verify staff role
  // -------------------------------------------

  useEffect(() => {
    let active = true;

    async function checkStaffRole() {
      setStaffRole(null);
      setRows([]);

      if (!supabase || !session?.user?.id) {
        if (active) setRoleLoading(false);
        return;
      }

      setRoleLoading(true);

      try {
        const { data, error } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) throw error;

        if (active) {
          const role = data?.role;

          setStaffRole(
            ["admin", "super_admin"].includes(role)
              ? role
              : null
          );
        }
      } catch (error) {
        console.error("Role verification failed:", error);

        if (active) {
          setStaffRole(null);
          setMessage("Unable to verify staff permissions.");
        }
      } finally {
        if (active) setRoleLoading(false);
      }
    }

    checkStaffRole();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const isAuthorized =
    staffRole === "admin" || staffRole === "super_admin";

  const isSuperAdmin = staffRole === "super_admin";

  // -------------------------------------------
  // Load reservations
  // -------------------------------------------

  const loadBookings = useCallback(async () => {
    if (!supabase || !isAuthorized) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      setRows(data || []);
    } catch (error) {
      console.error("Booking load failed:", error);
      setMessage(
        "Unable to load bookings. Check your staff permissions."
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      loadBookings();
    }
  }, [isAuthorized, loadBookings]);

  // -------------------------------------------
  // Login
  // -------------------------------------------

  async function handleLogin(e) {
    e.preventDefault();

    if (!supabase) return;

    setMessage("");
    setLoginLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (error) throw error;

      setPassword("");
    } catch (error) {
      console.error(error);

      setMessage(
        "Sign in failed. Please check your email and password."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // -------------------------------------------
  // Logout
  // -------------------------------------------

  async function handleLogout() {
    if (!supabase) return;

    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Unable to sign out. Please try again.");
      return;
    }

    setStaffRole(null);
    setRows([]);
    setActiveTab("reservations");
  }

  // -------------------------------------------
  // Update reservation status
  // -------------------------------------------

  async function updateBooking(id, newStatus) {
    if (!isAuthorized || updatingId) return;

    setMessage("");
    setUpdatingId(id);

    try {
      const booking = rows.find((item) => item.id === id);

      if (!booking) {
        throw new Error("Booking not found.");
      }

      const allowed =
        (booking.status === "pending" &&
          ["confirmed", "rejected"].includes(newStatus)) ||
        (booking.status === "confirmed" &&
          newStatus === "cancelled");

      if (!allowed) {
        throw new Error("Invalid booking status change.");
      }

      const { data, error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("status", booking.status)
        .select("id");

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          "Booking was already updated or access was denied."
        );
      }

      await loadBookings();

      setMessage(
        `Booking ${newStatus}. Use Send WhatsApp to notify the customer.`
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error.message || "Unable to update booking."
      );

      await loadBookings();
    } finally {
      setUpdatingId(null);
    }
  }

  // -------------------------------------------
  // Render
  // -------------------------------------------

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/">← VriSaa Café</a>

        <h1>VriSaa Café Admin Dashboard</h1>

        {session && (
          <button type="button" onClick={handleLogout}>
            Sign Out
          </button>
        )}
      </header>

      {!configured ? (
        <p>Supabase is not configured.</p>
      ) : authLoading ? (
        <p>Checking your session...</p>
      ) : !session ? (
        // -------------------------------------
        // Staff login page
        // -------------------------------------

        <form
          className="admin-login"
          onSubmit={handleLogin}
        >
          <h2>Staff Sign In</h2>

          <p>
            Sign in using your authorized café staff account.
          </p>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <button type="submit" disabled={loginLoading}>
            {loginLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      ) : roleLoading ? (
        <p>Verifying administrator permissions...</p>
      ) : !isAuthorized ? (
        // -------------------------------------
        // Unauthorized user
        // -------------------------------------

        <section className="admin-access-denied">
          <h2>Access Denied</h2>

          <p>
            Your account is authenticated, but it is not
            authorized to access the VriSaa Café dashboard.
          </p>

          <p>
            Please contact the café owner to request an
            administrator invitation.
          </p>

          <button type="button" onClick={handleLogout}>
            Sign Out
          </button>
        </section>
      ) : (
        // -------------------------------------
        // Authorized admin dashboard
        // -------------------------------------

        <section>
          <div className="admin-toolbar">
            <div>
              <h2>
                {isSuperAdmin
                  ? "Super Admin Dashboard"
                  : "Café Admin Dashboard"}
              </h2>

              <p>
                Signed in as {session.user.email}
              </p>
            </div>
          </div>

          {/* Dashboard navigation */}

          <div className="admin-dashboard-tabs">
            <button
              type="button"
              className={
                activeTab === "reservations" ? "active" : ""
              }
              onClick={() => setActiveTab("reservations")}
            >
              Reservations
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                className={
                  activeTab === "staff" ? "active" : ""
                }
                onClick={() => setActiveTab("staff")}
              >
                Manage Staff
              </button>
            )}
          </div>

          {/* Reservations */}

          {activeTab === "reservations" && (
            <>
              <div className="admin-toolbar">
                <h2>Booking Requests</h2>

                <button
                  type="button"
                  onClick={loadBookings}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>

              <div className="admin-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Guests</th>
                      <th>Special Requests</th>
                      <th>Status</th>
                      <th>Actions</th>
                      <th>Notification</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((booking) => (
                      <tr key={booking.id}>
                        <td>{booking.customer_name}</td>
                        <td>{booking.phone}</td>
                        <td>{booking.booking_date}</td>

                        <td>
                          {booking.booking_time?.slice(0, 5)}
                        </td>

                        <td>{booking.guests}</td>

                        <td>
                          {booking.notes || "—"}
                        </td>

                        <td>
                          <span
                            className={`admin-status admin-${booking.status}`}
                          >
                            {booking.status}
                          </span>
                        </td>

                        <td className="admin-actions">
                          {booking.status === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={Boolean(updatingId)}
                                onClick={() =>
                                  updateBooking(
                                    booking.id,
                                    "confirmed"
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                disabled={Boolean(updatingId)}
                                onClick={() =>
                                  updateBooking(
                                    booking.id,
                                    "rejected"
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {booking.status === "confirmed" && (
                            <button
                              type="button"
                              disabled={Boolean(updatingId)}
                              onClick={() =>
                                updateBooking(
                                  booking.id,
                                  "cancelled"
                                )
                              }
                            >
                              Cancel
                            </button>
                          )}
                        </td>

                        <td>
                          {[
                            "confirmed",
                            "rejected",
                            "cancelled",
                          ].includes(booking.status) && (
                            <button
                              type="button"
                              className="admin-whatsapp"
                              onClick={() =>
                                openWhatsApp(booking)
                              }
                            >
                              Send WhatsApp
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!rows.length && !loading && (
                  <p>No booking requests found.</p>
                )}
              </div>
            </>
          )}

          {/* Super Admin only */}

          {isSuperAdmin && activeTab === "staff" && (
            <StaffManagement />
          )}
        </section>
      )}

      {message && (
        <p className="admin-message" role="status">
          {message}
        </p>
      )}
    </main>
  );
}
