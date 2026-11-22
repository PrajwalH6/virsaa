
import React, {
  useEffect,
  useState,
  useCallback,
} from "react";

import { supabase, configured } from "../lib/supabase";
import StaffManagement from "./StaffManagement";
import "./Admin.css";

// ---------------------------------------
// WhatsApp message generator
// ---------------------------------------

function buildWhatsAppMessage(booking) {
  const name = booking.customer_name || "Guest";

  const date = new Date(
    `${booking.booking_date}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const time = new Date(
    `2000-01-01T${booking.booking_time}`
  ).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const guests = booking.guests;
  const reference = booking.id;

  const details =
    `*Reservation Details*\n` +
    `--------------------------\n` +
    `*Date:* ${date}\n` +
    `*Time:* ${time}\n` +
    `*Guests:* ${guests} ${guests === 1 ? "Person" : "People"}\n`;

  if (booking.status === "confirmed") {
    return (
      `*VRISAA CAFÉ*\n` +
      `*TABLE RESERVATION CONFIRMED*\n\n` +
      `Hello ${name}!\n\n` +
      `Your table reservation has been successfully confirmed. ` +
      `We look forward to hosting you!\n\n` +
      details +
      `*Status:* Confirmed\n\n` +
      `*Booking Reference*\n` +
      `${reference}\n\n` +
      `Please keep this reference for tracking your reservation.\n\n` +
      `Thank you for choosing VriSaa Café.\n\n` +
      `Warm regards,\n` +
      `*Team VriSaa Café*`
    );
  }

  if (booking.status === "rejected") {
    return (
      `*VRISAA CAFÉ*\n` +
      `*RESERVATION UPDATE*\n\n` +
      `Hello ${name},\n\n` +
      `Thank you for choosing VriSaa Café.\n\n` +
      `Unfortunately, we are unable to accommodate ` +
      `your requested reservation.\n\n` +
      details +
      `*Status:* Not Available\n\n` +
      `*Booking Reference*\n` +
      `${reference}\n\n` +
      `Please contact us to explore another available time.\n\n` +
      `Warm regards,\n` +
      `*Team VriSaa Café*`
    );
  }

  if (booking.status === "cancelled") {
    return (
      `*VRISAA CAFÉ*\n` +
      `*RESERVATION CANCELLED*\n\n` +
      `Hello ${name},\n\n` +
      `Your table reservation has been cancelled.\n\n` +
      details +
      `*Status:* Cancelled\n\n` +
      `*Booking Reference*\n` +
      `${reference}\n\n` +
      `If you would like to make another reservation, ` +
      `please contact us.\n\n` +
      `Warm regards,\n` +
      `*Team VriSaa Café*`
    );
  }

  return "";
}

// ---------------------------------------
// Open WhatsApp
// ---------------------------------------

function openWhatsApp(booking) {
  if (
    !["confirmed", "rejected", "cancelled"].includes(
      booking.status
    )
  ) {
    return;
  }

  // Normalize Indian phone number
  let phone = String(booking.phone || "").replace(/\D/g, "");

  if (phone.length === 10) {
    phone = "91" + phone;
  }

  if (!/^91[6-9]\d{9}$/.test(phone)) {
    alert("Please enter a valid Indian WhatsApp number.");
    return;
  }

  const message = buildWhatsAppMessage(booking);
  const encodedMessage = encodeURIComponent(message);

  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Attempts to open the installed WhatsApp app
    window.location.href =
      `whatsapp://send?phone=${phone}&text=${encodedMessage}`;
  } else {
    // Opens the customer's chat in WhatsApp Web
    window.open(
      `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`,
      "_blank",
      "noopener,noreferrer"
    );
  }
}

// ---------------------------------------
// Main Admin Component
// ---------------------------------------

export default function Admin() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [staffRole, setStaffRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reservations");
  const [rows, setRows] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  // Watch login/logout and restore the saved Supabase session.
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("Session check failed:", error);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    }).catch((error) => {
      console.error("Session check failed:", error);
      if (active) setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!active) return;
        setSession(newSession);
        setAuthLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ---------------------------------------
  // Verify Admin Role
  // ---------------------------------------

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
        console.error(error);

        if (active) {
          setStaffRole(null);
          setMessage(
            "Unable to verify administrator permissions."
          );
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
    staffRole === "admin" ||
    staffRole === "super_admin";

  const isSuperAdmin = staffRole === "super_admin";

  const totalBookings = rows.length;

const pendingBookings = rows.filter(
  (booking) => booking.status === "pending"
).length;

const confirmedBookings = rows.filter(
  (booking) => booking.status === "confirmed"
).length;

  // ---------------------------------------
  // Load Bookings
  // ---------------------------------------

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
      console.error(error);

      setMessage(
        "Unable to load bookings. Check staff permissions."
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

  // ---------------------------------------
  // Admin Login
  // ---------------------------------------

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
        "Login failed. Please check your email and password."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // ---------------------------------------
  // Forgot Password
  // ---------------------------------------

  async function handleForgotPassword(e) {
    e.preventDefault();

    if (!supabase) return;

    setResetLoading(true);
    setMessage("");

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          resetEmail.trim(),
          {
            redirectTo:
              `${window.location.origin}/admin/reset-password`,
          }
        );

      if (error) throw error;

      setMessage(
        "If an account exists for this email, a password reset link will be sent. Please check your inbox and spam folder."
      );

      setForgotPasswordMode(false);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to send the reset link. Please try again later."
      );
    } finally {
      setResetLoading(false);
    }
  }

  // ---------------------------------------
  // Logout
  // ---------------------------------------

  async function handleLogout() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage("Unable to sign out.");
      return;
    }

    setStaffRole(null);
    setRows([]);
    setActiveTab("reservations");
  }

  // ---------------------------------------
  // Update Booking
  // ---------------------------------------

  async function updateBooking(id, newStatus) {
    if (!isAuthorized || updatingId) return;

    setMessage("");
    setUpdatingId(id);

    try {
      const booking = rows.find(
        (item) => item.id === id
      );

      if (!booking) {
        throw new Error("Booking not found.");
      }

      const allowed =
        (booking.status === "pending" &&
          ["confirmed", "rejected"].includes(newStatus)) ||
        (booking.status === "confirmed" &&
          newStatus === "cancelled");

      if (!allowed) {
        throw new Error(
          "Invalid booking status change."
        );
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
          "Booking already updated or access denied."
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

  // ---------------------------------------
  // Render
  // ---------------------------------------

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a href="/">← VriSaa Café</a>

        <h1>VriSaa Café Admin Dashboard</h1>

        {session && (
          <button
            type="button"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        )}
      </header>

      {!configured ? (
        <p>Supabase is not configured.</p>
      ) : authLoading ? (
        <p>Checking your session...</p>
      ) : !session ? (
        <form
          className="admin-login"
          onSubmit={
            forgotPasswordMode
              ? handleForgotPassword
              : handleLogin
          }
        >
          <h2>
            {forgotPasswordMode
              ? "Forgot Password"
              : "Staff Sign In"}
          </h2>

          {forgotPasswordMode ? (
            <>
              <p>
                Enter your registered email address.
                We will send you a password recovery link.
              </p>

              <label>
                Email Address
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) =>
                    setResetEmail(e.target.value)
                  }
                  autoComplete="email"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={resetLoading}
              >
                {resetLoading
                  ? "Sending..."
                  : "Send Reset Link"}
              </button>

              <button
                type="button"
                className="admin-link-button"
                onClick={() => {
                  setForgotPasswordMode(false);
                  setMessage("");
                }}
              >
                Back to Sign In
              </button>
            </>
          ) : (
            <>
              <p>
                Sign in using your authorized
                café staff account.
              </p>

              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  autoComplete="current-password"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading
                  ? "Signing In..."
                  : "Sign In"}
              </button>

              <button
                type="button"
                className="admin-link-button"
                onClick={() => {
                  setResetEmail(email);
                  setForgotPasswordMode(true);
                  setMessage("");
                }}
              >
                Forgot Password?
              </button>
            </>
          )}
        </form>
      ) : roleLoading ? (
        <p>Verifying administrator permissions...</p>
      ) : !isAuthorized ? (
        <section className="admin-access-denied">
          <h2>Access Denied</h2>

          <p>
            Your account is authenticated,
            but you are not an authorized café admin.
          </p>

          <button
            type="button"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </section>
      ) : (
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
          
{/* Welcome Banner */}

<div className="admin-welcome-banner">
  <div>
    <span className="admin-welcome-label">
      VRISAA CAFÉ · MANAGEMENT PORTAL
    </span>

    <h2>Welcome back!</h2>

    <p>
      A beautiful café experience begins with
      thoughtful hospitality. Manage your guests
      and reservations from here.
    </p>
  </div>

  <div className="admin-welcome-symbol">
    ☕
  </div>
</div>

{/* Reservation Statistics */}

<div className="admin-stats-grid">
  <div className="admin-stat-card">
    <span>Total Reservations</span>
    <strong>{totalBookings}</strong>
    <small>Latest loaded bookings</small>
  </div>

  <div className="admin-stat-card">
    <span>Pending Requests</span>
    <strong>{pendingBookings}</strong>
    <small>Awaiting your approval</small>
  </div>

  <div className="admin-stat-card">
    <span>Confirmed Bookings</span>
    <strong>{confirmedBookings}</strong>
    <small>Ready to welcome</small>
  </div>
</div>

          <div className="admin-dashboard-tabs">
            <button
              type="button"
              className={
                activeTab === "reservations"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setActiveTab("reservations")
              }
            >
              Reservations
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                className={
                  activeTab === "staff"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveTab("staff")
                }
              >
                Manage Staff
              </button>
            )}
          </div>

          {activeTab === "reservations" && (
            <>
              <div className="admin-toolbar">
                <h2>Booking Requests</h2>

                <button
                  type="button"
                  onClick={loadBookings}
                  disabled={loading}
                >
                  {loading
                    ? "Loading..."
                    : "Refresh"}
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
                        <td>
                          {booking.customer_name}
                        </td>

                        <td>{booking.phone}</td>
                        <td>{booking.booking_date}</td>

                        <td>
                          {booking.booking_time?.slice(
                            0,
                            5
                          )}
                        </td>

                        <td>{booking.guests}</td>
                        <td>{booking.notes || "—"}</td>

                        <td>
                          <span
                            className={`admin-status admin-${booking.status}`}
                          >
                            {booking.status}
                          </span>
                        </td>

                        <td className="admin-actions">
                          {booking.status ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={Boolean(
                                  updatingId
                                )}
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
                                disabled={Boolean(
                                  updatingId
                                )}
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

                          {booking.status ===
                            "confirmed" && (
                            <button
                              type="button"
                              disabled={Boolean(
                                updatingId
                              )}
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
                          ].includes(
                            booking.status
                          ) && (
                            <button
                              type="button"
                              className="admin-whatsapp"
                              onClick={() =>
                                openWhatsApp(
                                  booking
                                )
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

                {!rows.length &&
                  !loading && (
                    <p>
                      No booking requests found.
                    </p>
                  )}
              </div>
            </>
          )}

          {isSuperAdmin &&
            activeTab === "staff" && (
              <StaffManagement />
            )}
        </section>
      )}

      {message && (
        <p
          className="admin-message"
          role="status"
        >
          {message}
        </p>
      )}
    </main>
  );
}
