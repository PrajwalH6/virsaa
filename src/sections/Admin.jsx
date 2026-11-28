
import { normalizeIndianMobile } from "../lib/reservations";
import React, {
  useEffect,
  useRef,
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

function WhatsAppActions({ booking }) {
  const [copyStatus, setCopyStatus] = useState("");
  const mobile = normalizeIndianMobile(booking.phone);
  if (!["confirmed", "rejected", "cancelled"].includes(booking.status)) return null;
  if (!mobile) return <span>Invalid mobile number</span>;

  const message = buildWhatsAppMessage(booking);
  const target = `phone=91${mobile}&text=${encodeURIComponent(message)}`;
  const web = `https://web.whatsapp.com/send?${target}`;
  const mobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus("Message copied.");
    } catch {
      setCopyStatus("Select and copy the message below.");
    }
  }

  return (
    <div className="admin-notification">
      <a className="admin-whatsapp" href={mobileDevice ? `whatsapp://send?${target}` : web}
        target={mobileDevice ? undefined : "_blank"} rel="noopener noreferrer">
        Send WhatsApp
      </a>
      <details>
        <summary>Message options</summary>
        {mobileDevice && <a href={`https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`}
          target="_blank" rel="noopener noreferrer">Open WhatsApp in browser</a>}
        <button type="button" onClick={copyMessage}>Copy message</button>
        {copyStatus && <p role="status">{copyStatus}</p>}
        {copyStatus.startsWith("Select") && (
          <textarea readOnly aria-label="WhatsApp message" value={message}
            onFocus={(event) => event.target.select()} />
        )}
      </details>
    </div>
  );
}

function ReservationStatus({ status }) {
  return <span className={`admin-status admin-${status}`}>{status}</span>;
}

function ReservationActions({ booking, disabled, onUpdate }) {
  const actions = booking.status === "pending"
    ? [["confirmed", "Approve"], ["rejected", "Reject"]]
    : booking.status === "confirmed" ? [["cancelled", "Cancel"]] : [];

  return (
    <div className="admin-actions">
      {actions.map(([status, label]) => (
        <button key={status} type="button" disabled={disabled}
          onClick={() => onUpdate(booking.id, status)}>
          {label}
        </button>
      ))}
    </div>
  );
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
  const [staffAccess, setStaffAccess] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reservations");
  const [rows, setRows] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [counts, setCounts] = useState({ total: 0, pending: 0, confirmed: 0, filtered: 0 });
  const bookingRequest = useRef(0);
  const bookingInFlight = useRef(false);
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
      setStaffAccess(null);
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

          setStaffAccess({ userId: session.user.id, role });
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setStaffAccess(null);
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

  const staffRole = staffAccess?.userId === session?.user?.id ? staffAccess?.role : null;
  const isAuthorized =
    staffRole === "admin" ||
    staffRole === "super_admin";

  const isSuperAdmin = staffRole === "super_admin";

  const pageCount = Math.max(1, Math.ceil(counts.filtered / pageSize));

  const loadBookings = useCallback(async (background = false) => {
    if (!supabase || !isAuthorized || (background && bookingInFlight.current)) return;

    const request = ++bookingRequest.current;
    bookingInFlight.current = true;
    if (!background) setLoading(true);

    try {
      const { data, error } = await supabase.rpc("cafe_reservation_page", {
        p_page: page,
        p_size: pageSize,
        p_search: search.trim(),
        p_date: date || null,
        p_status: status || null,
      });

      if (request !== bookingRequest.current) return;
      if (error) throw error;

      const lastPage = Math.max(1, Math.ceil(data.filtered / pageSize));
      setCounts(data);
      if (page > lastPage) {
        setRows([]);
        setPage(lastPage);
      } else {
        setRows(data.rows);
      }
    } catch (error) {
      if (request === bookingRequest.current && (!background || error.code === "42501")) {
        setRows([]);
        setMessage("Unable to load bookings. Check staff permissions and try again.");
      }
    } finally {
      if (request === bookingRequest.current) {
        bookingInFlight.current = false;
        setLoading(false);
      }
    }
  }, [isAuthorized, page, pageSize, search, date, status]);

  useEffect(() => {
    loadBookings();
    return () => { bookingRequest.current += 1; };
  }, [loadBookings, refresh]);

  useEffect(() => {
    if (!isAuthorized || activeTab !== "reservations" || updatingId) return;

    function refreshVisibleDashboard() {
      if (document.visibilityState === "visible") loadBookings(true);
    }

    const timer = window.setInterval(refreshVisibleDashboard, 30_000);
    return () => window.clearInterval(timer);
  }, [activeTab, isAuthorized, loadBookings, updatingId]);

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

    setStaffAccess(null);
    setRows([]);
    setCounts({ total: 0, pending: 0, confirmed: 0, filtered: 0 });
    setPage(1);
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

      setRefresh((value) => value + 1);

      setMessage(
        `Booking ${newStatus}. Use Send WhatsApp to notify the customer.`
      );
    } catch (error) {
      setRefresh((value) => value + 1);
      setMessage(error.message || "Unable to update booking.");
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
    <strong>{counts.total}</strong>
    <small>All reservation records</small>
  </div>

  <div className="admin-stat-card">
    <span>Pending Requests</span>
    <strong>{counts.pending}</strong>
    <small>Awaiting your approval</small>
  </div>

  <div className="admin-stat-card">
    <span>Confirmed Bookings</span>
    <strong>{counts.confirmed}</strong>
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
                  onClick={() => loadBookings()}
                  disabled={loading}
                >
                  {loading
                    ? "Loading..."
                    : "Refresh"}
                </button>
              </div>

              <div className="admin-filters">
                <label>
                  Search bookings
                  <input type="search" value={search} maxLength={100}
                    placeholder="Name, mobile or reference"
                    onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                  />
                </label>
                <label>
                  Booking date
                  <input type="date" value={date}
                    onChange={(event) => { setDate(event.target.value); setPage(1); }}
                  />
                </label>
                <label>
                  Status
                  <select value={status}
                    onChange={(event) => { setStatus(event.target.value); setPage(1); }}
                  >
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label>
                  Per page
                  <select value={pageSize}
                    onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
              </div>

              <div className="admin-table-wrap" aria-busy={loading}>
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

                        <td><ReservationStatus status={booking.status} /></td>
                        <td>
                          <ReservationActions booking={booking} disabled={loading || Boolean(updatingId)}
                            onUpdate={updateBooking} />
                        </td>
                        <td><WhatsAppActions key={booking.status} booking={booking} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

              </div>
              <div className="admin-reservation-cards" aria-busy={loading}>
                {rows.map((booking) => (
                  <article className="admin-reservation-card" key={booking.id}>
                    <header>
                      <h3>{booking.customer_name}</h3>
                      <ReservationStatus status={booking.status} />
                    </header>
                    <dl>
                      <div><dt>Phone</dt><dd>{booking.phone}</dd></div>
                      <div><dt>Date</dt><dd>{booking.booking_date}</dd></div>
                      <div><dt>Time</dt><dd>{booking.booking_time?.slice(0, 5)}</dd></div>
                      <div><dt>Guests</dt><dd>{booking.guests}</dd></div>
                      <div className="admin-card-full-width"><dt>Special requests</dt><dd>{booking.notes || "—"}</dd></div>
                      <div className="admin-card-full-width"><dt>Booking reference</dt><dd>{booking.id}</dd></div>
                    </dl>
                    <ReservationActions booking={booking} disabled={loading || Boolean(updatingId)}
                      onUpdate={updateBooking} />
                    <WhatsAppActions key={booking.status} booking={booking} />
                  </article>
                ))}
              </div>
              {!rows.length && !loading && <p>No booking requests found.</p>}
              <nav className="admin-pagination" aria-label="Reservation pages">
                <button type="button" disabled={loading || page <= 1}
                  onClick={() => setPage(page - 1)}>Previous</button>
                <span role="status">Page {page} of {pageCount} · {counts.filtered} matching records</span>
                <button type="button" disabled={loading || page >= pageCount}
                  onClick={() => setPage(page + 1)}>Next</button>
              </nav>
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
