
import React, { useEffect, useRef, useState } from "react";
import { supabase, configured } from "../lib/supabase";
import { cafeDateTime, isFutureBooking, normalizeIndianMobile, reservationAttempt } from "../lib/reservations";
import "./Booking.css";

const initialForm = {
  customer_name: "",
  phone: "",
  booking_date: "",
  booking_time: "",
  guests: 2,
  notes: "",
};

export default function Booking() {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  const submitting = useRef(false);
  const [clock, setClock] = useState(() => cafeDateTime(Date.now() + 60_000));

  useEffect(() => {
    const timer = setInterval(() => {
      const next = cafeDateTime(Date.now() + 60_000);
      setClock((current) => current.date === next.date && current.time === next.time ? current : next);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;

    setMessage("");
    setReference("");

    if (!configured) {
      setMessage("Online booking is currently unavailable.");
      return;
    }

    const phone = normalizeIndianMobile(form.phone);
    if (!phone) {
      setMessage("Enter a valid Indian mobile number, with or without +91.");
      return;
    }

    const name = form.customer_name.trim();
    if (!name) {
      setMessage("Enter your full name.");
      return;
    }

    const details = {
      p_name: name,
      p_phone: phone,
      p_date: form.booking_date,
      p_time: form.booking_time,
      p_guests: Number(form.guests),
      p_notes: form.notes.trim(),
    };

    submitting.current = true;
    setBusy(true);

    try {
      // Reject new past requests before saving a retry key. The RPC checks again.
      const future = isFutureBooking(details.p_date, details.p_time);
      const { key, retry } = await reservationAttempt(details, sessionStorage, future);
      if (!future && !retry) {
        setMessage("Choose a future date and time in India Standard Time.");
        return;
      }

      const { data: bookingId, error } = await supabase.rpc("submit_reservation", {
        ...details,
        p_key: key,
      });

      if (error) throw error;

      setReference(bookingId);
      setForm(initialForm);

      setMessage(
        "Your booking request was submitted successfully. " +
        "It is pending approval from VriSaa Café."
      );
    } catch (error) {
      if (error.code === "PT429") {
        setMessage("Too many booking attempts. Please wait a few minutes and retry with the same details.");
      } else {
        setMessage(error.code === "22023" ? error.message : "Unable to submit your request. Please try again with the same details.");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setMessage("Booking reference copied successfully.");
    } catch {
      setMessage(
        "Please select and copy your booking reference manually."
      );
    }
  }

  return (
    <section id="booking" className="booking-section">
      <div className="booking-wrap">
        <div className="booking-intro">
          <span className="booking-kicker">
            A SEAT FOR EVERY OCCASION
          </span>

          <h2>
            Reserve Your <em>Table</em>
          </h2>

          <p>
            Good food is even better together.
            Send us your preferred date and time,
            and our team will review your request.
          </p>

          <div className="booking-hint">
            All reservations require confirmation
            from our café team.
          </div>

          <a
            href="#track-booking"
            className="booking-track-link"
          >
            Already requested a table? Track your booking →
          </a>
        </div>

        <form
          className="booking-form"
          onSubmit={handleSubmit}
        >
          <h3>Request a Reservation</h3>

          <div className="booking-grid">
            <label>
              Full Name
              <input
                type="text"
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                maxLength={100}
                placeholder="Your full name"
                required
              />
            </label>

            <label>
              Mobile Number
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 or 10-digit mobile number"
                autoComplete="tel"
                required
              />
            </label>

            <label>
              Booking Date
              <input
                type="date"
                name="booking_date"
                value={form.booking_date}
                min={cafeDateTime().date}
                onInvalid={(event) => {
                  if (event.target.validity.rangeUnderflow) {
                    setMessage("Choose today or a future date in India Standard Time.");
                  }
                }}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Preferred Time (IST)
              <input
                type="time"
                name="booking_time"
                value={form.booking_time}
                min={form.booking_date === clock.date ? clock.time : undefined}
                max={form.booking_date && form.booking_date < clock.date ? "00:00" : undefined}
                onInvalid={(event) => {
                  if (event.target.validity.rangeUnderflow || event.target.validity.rangeOverflow) {
                    setMessage("Choose a future time in India Standard Time.");
                  }
                }}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Number of Guests
              <select
                name="guests"
                value={form.guests}
                onChange={handleChange}
              >
                {Array.from(
                  { length: 12 },
                  (_, i) => i + 1
                ).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "Guest" : "Guests"}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Special Requests (Optional)
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              maxLength={500}
              rows={3}
              placeholder="Birthday, seating preference..."
            />
          </label>

          <button type="submit" disabled={busy}>
            {busy ? "Submitting..." : "Request a Table"}
          </button>

          {message && (
            <p className="booking-message" role="status">
              {message}
            </p>
          )}

          {reference && (
            <div className="booking-reference">
              <h4>Your Booking Reference</h4>

              <p className="reference-code">
                {reference}
              </p>

              <button
                type="button"
                onClick={copyReference}
              >
                Copy Reference
              </button>

              <p>
                Save this reference privately.
                Use it with your booking mobile number to track your request.
                This is not a confirmed reservation.
              </p>

              <a href="#track-booking">
                Track Booking Status →
              </a>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
