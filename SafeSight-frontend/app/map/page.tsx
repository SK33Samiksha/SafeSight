'use client';

import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type * as Leaflet from 'leaflet';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { Flame, Layers, MapPin, RefreshCw, Users, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { kmeans, type Hotspot, type RiskLevel } from '@/lib/kmeans';

interface MissingDoc {
  _id: string;
  name: string;
  age?: number;
  images: string[];
  lastSeenLocation?: string;
  coords?: { lat: number; lng: number };
  status?: string;
}
interface FoundDoc {
  _id: string;
  image: string;
  location?: string;
  coords?: { lat: number; lng: number };
  seenAt?: string;
  matches: { missingPerson: string | { _id: string; name: string }; confidence?: number; manual?: boolean }[];
}

type Filter = 'all' | 'missing' | 'sighting';

const RISK_COLOR: Record<RiskLevel, string> = { high: '#ef4444', medium: '#f97316', low: '#eab308' };
const MISSING_COLOR = '#ef4444';
const SIGHTING_COLOR = '#3b82f6';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const pinSvg = (color: string) =>
  `<svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="#fff"/></svg>`;

function MapContent() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const fittedRef = useRef(false);

  const [missing, setMissing] = useState<MissingDoc[]>([]);
  const [found, setFound] = useState<FoundDoc[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [showHotspots, setShowHotspots] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [m, f] = await Promise.all([
        api<{ data: MissingDoc[] }>('/api/missing?status=missing'),
        api<{ data: FoundDoc[] }>('/api/found'),
      ]);
      setMissing(m.data);
      setFound(f.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load map data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Create the Leaflet map once (Leaflet needs `window`, so import it here)
  useEffect(() => {
    let cancelled = false;
    import('leaflet').then((L) => {
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, { zoomControl: true }).setView([20.5937, 78.9629], 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const missingPts = useMemo(() => missing.filter((p) => p.coords?.lat != null), [missing]);
  const foundPts = useMemo(() => found.filter((p) => p.coords?.lat != null), [found]);

  // ML hotspot detection over missing-person locations
  const hotspots: Hotspot[] = useMemo(
    () => kmeans(missingPts.map((p) => ({ id: p._id, lat: p.coords!.lat, lng: p.coords!.lng }))),
    [missingPts]
  );

  // Draw markers + clusters whenever data or filters change
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!mapReady || !L || !map || !layer) return;
    layer.clearLayers();
    const bounds: [number, number][] = [];

    const icon = (color: string) =>
      L.divIcon({ html: pinSvg(color), className: '', iconSize: [28, 40], iconAnchor: [14, 40], popupAnchor: [0, -36] });

    const addMarker = (lat: number, lng: number, color: string, html: string) => {
      const m = L.marker([lat, lng], { icon: icon(color) }).bindPopup(html, { maxWidth: 240 });
      m.on('click', () => map.flyTo([lat, lng], Math.max(map.getZoom(), 12), { duration: 0.8 }));
      m.addTo(layer);
      bounds.push([lat, lng]);
    };

    if (filter !== 'sighting') {
      for (const p of missingPts) {
        const { lat, lng } = p.coords!;
        addMarker(
          lat,
          lng,
          MISSING_COLOR,
          `<div style="min-width:180px">
            ${p.images[0] ? `<img src="${esc(p.images[0])}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>` : ''}
            <strong>${esc(p.name)}</strong>${p.age != null ? `, ${esc(p.age)} yrs` : ''}<br/>
            <span style="color:#666">Last seen: ${esc(p.lastSeenLocation)}</span><br/>
            <span style="color:#999;font-size:11px">${lat.toFixed(4)}, ${lng.toFixed(4)}</span><br/>
            <a href="/cases/${esc(p._id)}" style="display:inline-block;margin-top:6px">View full case →</a>
          </div>`
        );
      }
    }

    if (filter !== 'missing') {
      for (const s of foundPts) {
        const { lat, lng } = s.coords!;
        const top = s.matches?.find((m) => m.missingPerson);
        addMarker(
          lat,
          lng,
          SIGHTING_COLOR,
          `<div style="min-width:180px">
            <img src="${esc(s.image)}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px"/>
            <strong>Citizen sighting</strong><br/>
            <span style="color:#666">${esc(s.location)}</span><br/>
            <span style="color:#999;font-size:11px">${lat.toFixed(4)}, ${lng.toFixed(4)}</span><br/>
            ${top ? `<a href="/cases/${esc(typeof top.missingPerson === 'string' ? top.missingPerson : top.missingPerson?._id)}" style="display:inline-block;margin-top:6px">${top.manual ? 'Reported sighting' : `${esc(top.confidence)}% match`} — view case →</a>` : '<span style="color:#999">No match</span>'}
          </div>`
        );
      }
    }

    if (showHotspots && filter !== 'sighting') {
      for (const h of hotspots) {
        L.circle([h.center.lat, h.center.lng], {
          // at least 5 km so single-person clusters are still visible
          radius: Math.max(h.radiusKm, 5) * 1000,
          color: RISK_COLOR[h.risk],
          fillColor: RISK_COLOR[h.risk],
          fillOpacity: 0.15,
          weight: 2,
        })
          .bindTooltip(`Hotspot ${h.id}: ${h.members.length} person(s), ${h.risk} risk`)
          .addTo(layer);
      }
    }

    // Auto-zoom to fit all markers the first time data arrives
    if (!fittedRef.current && bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      fittedRef.current = true;
    }
  }, [mapReady, missingPts, foundPts, hotspots, filter, showHotspots]);

  const flyToHotspot = (h: Hotspot) =>
    mapRef.current?.flyTo([h.center.lat, h.center.lng], 9, { duration: 0.8 });

  const unmapped = missing.length - missingPts.length + (found.length - foundPts.length);
  const stats = [
    { label: 'Hotspot zones', value: hotspots.length, icon: Flame },
    { label: 'High risk', value: hotspots.filter((h) => h.risk === 'high').length, icon: AlertTriangle },
    { label: 'Medium risk', value: hotspots.filter((h) => h.risk === 'medium').length, icon: Layers },
    { label: 'Persons clustered', value: hotspots.reduce((s, h) => s + h.members.length, 0), icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">Sightings Map</h1>
                <p className="text-muted-foreground text-sm">
                  Missing persons, citizen sightings and ML-detected hotspot zones (KMeans).
                </p>
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 border border-border rounded-lg px-4 py-2 text-sm text-foreground hover:bg-secondary disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-accent" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {(['all', 'missing', 'sighting'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'missing' ? 'Missing' : 'Sightings'}
                </button>
              ))}
              <button
                onClick={() => setShowHotspots((v) => !v)}
                className={`ml-auto px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                  showHotspots ? 'bg-orange-500/20 text-orange-500' : 'bg-secondary text-foreground'
                }`}
              >
                <Flame className="w-4 h-4" /> {showHotspots ? 'Hide' : 'Show'} hotspots
              </button>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <div ref={mapEl} className="h-[560px] w-full rounded-xl border border-border overflow-hidden z-0" />
                {unmapped > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {unmapped} record(s) have no coordinates yet — run <code>npm run fix-coords</code> in the backend.
                  </p>
                )}
              </div>

              <aside className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="font-semibold text-foreground mb-3 text-sm">Legend</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><MapPin className="w-4 h-4" style={{ color: MISSING_COLOR }} /> Missing — last seen</li>
                    <li className="flex items-center gap-2"><MapPin className="w-4 h-4" style={{ color: SIGHTING_COLOR }} /> Citizen sighting</li>
                    {(['high', 'medium', 'low'] as RiskLevel[]).map((r) => (
                      <li key={r} className="flex items-center gap-2 capitalize">
                        <span className="w-4 h-4 rounded-full border-2" style={{ borderColor: RISK_COLOR[r], background: `${RISK_COLOR[r]}33` }} />
                        {r} risk zone ({r === 'high' ? '4+' : r === 'medium' ? '2–3' : '1'} persons)
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="font-semibold text-foreground mb-3 text-sm">Hotspot zones</h2>
                  {hotspots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No located missing persons yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {hotspots.map((h) => (
                        <li key={h.id}>
                          <button
                            onClick={() => flyToHotspot(h)}
                            className="w-full text-left bg-secondary hover:bg-secondary/70 rounded-lg p-3 text-sm"
                          >
                            <span className="font-medium text-foreground">Zone {h.id}</span>{' '}
                            <span className="capitalize font-semibold" style={{ color: RISK_COLOR[h.risk] }}>
                              {h.risk}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {h.members.length} person(s) · ~{Math.round(h.radiusKm)} km radius
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-card border border-border rounded-xl p-4 max-h-72 overflow-auto">
                  <h2 className="font-semibold text-foreground mb-3 text-sm">People ({missing.length})</h2>
                  <ul className="space-y-2">
                    {missing.map((p) => (
                      <li key={p._id}>
                        <Link href={`/cases/${p._id}`} className="flex items-center gap-3 hover:bg-secondary rounded-lg p-1">
                          <img src={p.images[0] || '/placeholder-user.jpg'} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <span className="text-sm text-foreground truncate">{p.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <ProtectedRoute>
      <MapContent />
    </ProtectedRoute>
  );
}
