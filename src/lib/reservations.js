const cafeClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function cafeDateTime(now = Date.now()) {
  const parts = Object.fromEntries(
    cafeClock.formatToParts(now).map(({ type, value }) => [type, value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function normalizeIndianMobile(value) {
  const number = value.trim();
  return /^(?:\+91)?[6-9]\d{9}$/.test(number) ? number.slice(-10) : null;
}

export function trackingPhone(value) {
  const number = value.trim();
  // Older bookings accepted any ten digits. Keep those references usable.
  return /^(?:\+91)?\d{10}$/.test(number) ? number.slice(-10) : null;
}

export function isFutureBooking(date, time, now = new Date()) {
  const cafe = cafeDateTime(now);
  return Boolean(date && time) && (date > cafe.date || (date === cafe.date && time > cafe.time));
}

export async function reservationAttempt(details, storage = sessionStorage, create = true) {
  const payload = new TextEncoder().encode(JSON.stringify(details));
  const digest = await crypto.subtle.digest("SHA-256", payload);
  const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  const storageKey = `vrisaa:booking:${fingerprint}`;
  const saved = storage.getItem(storageKey);
  if (saved) return { key: saved, retry: true };
  if (!create) return { key: null, retry: false };
  const key = crypto.randomUUID();
  storage.setItem(storageKey, key);
  return { key, retry: false };
}
