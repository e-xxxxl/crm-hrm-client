import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const NGN_WHOLE = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Format kobo-free naira amounts. Pass `whole` to drop the decimals. */
export function money(amount, { whole = false } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return (whole ? NGN_WHOLE : NGN).format(n);
}

export function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString("en-NG") : "—";
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  const d = typeof value === "string" ? parseISO(value) : new Date(value);
  return isValid(d) ? d : null;
}

export function dateShort(value) {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy") : "—";
}

export function dateLong(value) {
  const d = toDate(value);
  return d ? format(d, "EEEE, d MMMM yyyy") : "—";
}

export function dateTime(value) {
  const d = toDate(value);
  return d ? format(d, "d MMM yyyy, HH:mm") : "—";
}

export function timeOnly(value) {
  const d = toDate(value);
  return d ? format(d, "HH:mm") : "—";
}

export function fromNow(value) {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "—";
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function fullName(person) {
  if (!person) return "—";
  return (
    person.name ||
    [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ") ||
    "—"
  );
}

/** "3.5" -> "3.5 days", "1" -> "1 day" */
export function days(count) {
  const n = Number(count);
  if (!Number.isFinite(n)) return "—";
  return `${n % 1 === 0 ? n : n.toFixed(1)} day${n === 1 ? "" : "s"}`;
}

/**
 * Human-readable location for a GPS punch (attendance clock-in/out, POD, …).
 * Prefers the reverse-geocoded address; falls back to raw coordinates when
 * the geocoder had nothing (rate-limited, offline, or just slow) so the exact
 * spot is still visible rather than a blank dash. `punch` may carry either
 * `{ latitude, longitude }` or a GeoJSON-style `{ coordinates: [lng, lat] }`.
 */
export function formatLocation(punch) {
  if (!punch) return "—";
  if (punch.address) return punch.address;
  let lat = punch.latitude;
  let lng = punch.longitude;
  if ((lat == null || lng == null) && Array.isArray(punch.coordinates) && punch.coordinates.length === 2) {
    [lng, lat] = punch.coordinates;
  }
  if (lat == null || lng == null) return "—";
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
}

/** Google Maps link for a GPS punch, or null if there's nothing to point at. */
export function mapsLink(punch) {
  if (!punch) return null;
  let lat = punch.latitude;
  let lng = punch.longitude;
  if ((lat == null || lng == null) && Array.isArray(punch.coordinates) && punch.coordinates.length === 2) {
    [lng, lat] = punch.coordinates;
  }
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
