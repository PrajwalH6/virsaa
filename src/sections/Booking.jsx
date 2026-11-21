
import React, { useState } from "react";
import { supabase, configured } from "../lib/supabase";
import "./Booking.css";

const initialForm = {
  customer_name: "",
  phone: "",
  booking_date: "",
  booking_time: "",
  guests: 2,
  notes: "",
};

function today() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function Booking() {
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setReference("");

    if (!configured) {
      setMessage("Online booking is currently unavailable.");
      return;
    }

    if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      setMessage("Enter a valid 10-digit mobile number.");
      return;
    }

    if (form.booking_date < today()) {
      setMessage("Please choose a valid future date.");
      return;
    }

    const bookingId = crypto.randomUUID();

    setBusy(true);

    try {
      const { error } = await supabase
        .from("reservations")
        .insert({
          id: bookingId,
          customer_name: form.customer_name.trim(),
          phone: form.phone.trim(),
          booking_date: form.booking_date,
          booking_time: form.booking_time,
          guests: Number(form.guests),
          notes: form.notes.trim(),
        });

      if (error) throw error;

      setReference(bookingId);
      setForm(initialForm);

      setMessage(
        "Your booking request was submitted successfully. " +
        "It is pending approval from VriSaa Café."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to submit your request. Please try again."
      );
    } finally {
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
                placeholder="10-digit mobile number"
                pattern="[0-9]{10}"
                inputMode="numeric"
                required
              />
            </label>

            <label>
              Booking Date
              <input
                type="date"
                name="booking_date"
                value={form.booking_date}
                min={today()}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Preferred Time
              <input
                type="time"
                name="booking_time"
                value={form.booking_time}
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
                You will need it to track your booking.
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
