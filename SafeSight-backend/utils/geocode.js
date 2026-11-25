import axios from "axios";

// Converts free text ("Juhu Beach, Mumbai") to { lat, lng } using
// OpenStreetMap Nominatim. Returns null if the place can't be found so the
// record is still saved (and can be fixed later with `npm run fix-coords`).
// Nominatim policy: identify the app and make at most ~1 request/second.
let lastCall = 0;

export async function geocode(text) {
  if (!text || !text.trim()) return null;
  if (process.env.NODE_ENV === "test") return null; // no network calls in tests

  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  try {
    const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: { q: text, format: "json", limit: 1 },
      headers: { "User-Agent": "SafeSight/1.0 (student project)" },
      timeout: 8000,
    });
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch (err) {
    console.warn("Geocoding failed for", JSON.stringify(text), "-", err.message);
    return null;
  }
}
