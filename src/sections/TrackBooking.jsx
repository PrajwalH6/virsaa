
import React, { useState } from "react";
import { supabase, configured } from "../lib/supabase";
import "./TrackBooking.css";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const statusMessages = {
  pending:
    "Your request has been received and is awaiting café approval.",

  confirmed:
    "Your table reservation has been confirmed. We look forward to welcoming you!",

  rejected:
    "Unfortunately, your booking request was not approved. Please contact the café for assistance.",

  cancelled:
    "This reservation has been cancelled.",
};

export default function TrackBooking() {
  const [reference, setReference] = useState("");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleTrack(e) {
    e.preventDefault();

    setError("");
    setBooking(null);

    if (!configured) {
      setError("Booking tracking is currently unavailable.");
      return;
    }

    const id = reference.trim();

    if (!uuidPattern.test(id)) {
      setError("Please enter a valid booking reference.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: queryError } =
        await supabase.rpc("track_reservation", {
          p_booking_id: id,
        });

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        setError(
          "No booking was found for this reference."
        );
        return;
      }

      setBooking(data[0]);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to check booking status. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      id="track-booking"
      className="track-section"
    >
      <div className="track-container">
        <span className="track-kicker">
          YOUR RESERVATION
        </span>

        <h2>Track Your Booking</h2>

        <p className="track-description">
          Enter the private booking reference you received
          when submitting your table request.
        </p>

        <form onSubmit={handleTrack}>
          <label htmlFor="booking-reference">
            Booking Reference
          </label>

          <input
            id="booking-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            maxLength={36}
            autoComplete="off"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Checking..." : "Check Status"}
          </button>
        </form>

        {error && (
          <p className="track-error" role="alert">
            {error}
          </p>
        )}

        {booking && (
          <div className="track-result" role="status">
            <h3>Reservation Details</h3>

            <div className="track-details">
              <p>
                <strong>Date:</strong>{" "}
                {booking.booking_date}
              </p>

              <p>
                <strong>Time:</strong>{" "}
                {booking.booking_time?.slice(0, 5)}
              </p>

              <p>
                <strong>Guests:</strong>{" "}
                {booking.guests}
              </p>
            </div>

            <span
              className={`track-status status-${booking.status}`}
            >
              {booking.status}
            </span>

            <p className="track-status-message">
              {statusMessages[booking.status] ||
                "Please contact the café for details."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
