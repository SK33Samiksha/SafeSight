// KMeans hotspot detection for the Sightings Map (report section 3.4).
// Pure functions, no dependencies, so it runs in the browser and can be tested.

export interface GeoPoint {
  id: string;
  lat: number;
  lng: number;
}

export type RiskLevel = 'high' | 'medium' | 'low';

export interface Hotspot {
  id: number;
  center: { lat: number; lng: number };
  members: string[]; // point ids
  radiusKm: number; // distance from centre to the furthest member
  risk: RiskLevel;
}

/** k = max(1, min(5, ceil(n / 3))) — as described in the report. */
export const chooseK = (n: number) => Math.max(1, Math.min(5, Math.ceil(n / 3)));

/** Risk by cluster size: 4+ high, 2–3 medium, 1 low. */
export const riskFor = (size: number): RiskLevel =>
  size >= 4 ? 'high' : size >= 2 ? 'medium' : 'low';

/** Great-circle distance in kilometres. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const sqDist = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
  (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;

/**
 * Deterministic k-means++ seeding: first centre = first point, each next centre
 * = the point furthest from all chosen centres. Same data -> same hotspots on
 * every refresh (random seeding made clusters jump around).
 */
function initCentres(points: GeoPoint[], k: number) {
  const centres = [{ lat: points[0].lat, lng: points[0].lng }];
  while (centres.length < k) {
    let best = points[0];
    let bestD = -1;
    for (const p of points) {
      const d = Math.min(...centres.map((c) => sqDist(p, c)));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    if (bestD === 0) break; // fewer distinct locations than k
    centres.push({ lat: best.lat, lng: best.lng });
  }
  return centres;
}

export function kmeans(points: GeoPoint[], maxIter = 50): Hotspot[] {
  if (points.length === 0) return [];
  const k = Math.min(chooseK(points.length), points.length);
  let centres = initCentres(points, k);
  let assign = new Array(points.length).fill(-1);

  for (let iter = 0; iter < maxIter; iter++) {
    // 1. assign each point to its nearest centre (Euclidean on lat/lng)
    let changed = false;
    points.forEach((p, i) => {
      let best = 0;
      for (let c = 1; c < centres.length; c++) {
        if (sqDist(p, centres[c]) < sqDist(p, centres[best])) best = c;
      }
      if (assign[i] !== best) {
        assign[i] = best;
        changed = true;
      }
    });
    if (!changed) break; // converged

    // 2. move each centre to the mean of its points
    centres = centres.map((c, ci) => {
      const members = points.filter((_, i) => assign[i] === ci);
      if (members.length === 0) return c;
      return {
        lat: members.reduce((s, p) => s + p.lat, 0) / members.length,
        lng: members.reduce((s, p) => s + p.lng, 0) / members.length,
      };
    });
  }

  return centres
    .map((center, ci) => {
      const members = points.filter((_, i) => assign[i] === ci);
      const radiusKm = Math.max(0, ...members.map((p) => haversineKm(center, p)));
      return {
        id: ci,
        center,
        members: members.map((m) => m.id),
        radiusKm,
        risk: riskFor(members.length),
      };
    })
    .filter((h) => h.members.length > 0)
    .sort((a, b) => b.members.length - a.members.length)
    .map((h, i) => ({ ...h, id: i + 1 }));
}
