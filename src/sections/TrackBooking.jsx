
import React, { useEffect, useRef, useState } from "react";
import { supabase, configured } from "../lib/supabase";
import { trackingPhone } from "../lib/reservations";
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
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRequest = useRef(null);

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeRequest.current = null;
  }, []);

  function editLookup(setValue, value) {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setValue(value);
    setBooking(null);
    setError("");
    setLoading(false);
  }

  async function handleTrack(e) {
    e.preventDefault();
    if (activeRequest.current) return;

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

    const mobile = trackingPhone(phone);
    if (!mobile) {
      setError("Enter the mobile number used to book.");
      return;
    }

    const request = new AbortController();
    activeRequest.current = request;
    setLoading(true);

    try {
      const { data, error: queryError } =
        await supabase.rpc("track_reservation", {
          p_booking_id: id,
          p_phone: mobile,
        }).abortSignal(request.signal);

      if (activeRequest.current !== request) return;

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        setError(
          "No booking matched that reference and mobile number."
        );
        return;
      }

      setBooking(data[0]);
    } catch (err) {
      if (activeRequest.current !== request) return;
      setError(err.code === "PT429"
        ? "Too many status checks. Please wait a few minutes and try again."
        : "Unable to check booking status. Please try again.");
    } finally {
      if (activeRequest.current === request) {
        activeRequest.current = null;
        setLoading(false);
      }
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
          when submitting your table request, along with the mobile number you entered.
        </p>

        <form onSubmit={handleTrack}>
          <label htmlFor="booking-reference">
            Booking Reference
          </label>

          <input
            id="booking-reference"
            type="text"
            value={reference}
            onChange={(e) => editLookup(setReference, e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            maxLength={36}
            autoComplete="off"
            required
          />

          <label htmlFor="tracking-phone">Booking Mobile Number</label>
          <input
            id="tracking-phone"
            type="tel"
            value={phone}
            onChange={(e) => editLookup(setPhone, e.target.value)}
            autoComplete="tel"
            placeholder="+91 or 10-digit mobile number"
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
