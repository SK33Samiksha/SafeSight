'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Search } from 'lucide-react';
import { api, timeAgo } from '@/lib/api';

interface MissingPerson {
  _id: string;
  name: string;
  age?: number;
  gender?: string;
  images: string[];
  lastSeenLocation?: string;
  status?: 'missing' | 'found';
  createdAt: string;
}

type StatusFilter = 'all' | 'missing' | 'found';

function CasesContent() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<MissingPerson[] | null>(null);
  const [error, setError] = useState('');

  // Read ?status= / ?q= from the URL (dashboard and navbar search use them),
  // and react to searches typed in the navbar while already on this page.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const s = p.get('status');
    if (s === 'missing' || s === 'found') setStatus(s);
    if (p.get('q')) setQuery(p.get('q')!);
    const onSearch = (e: Event) => setQuery((e as CustomEvent<string>).detail);
    window.addEventListener('safesight:search', onSearch);
    return () => window.removeEventListener('safesight:search', onSearch);
  }, []);

  // Reload whenever the filter or search text changes (search waits 300 ms)
  useEffect(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (query.trim()) params.set('q', query.trim());
    window.history.replaceState(null, '', status === 'all' ? '/cases' : `/cases?status=${status}`);

    let stale = false; // ignore answers to an older filter
    const t = setTimeout(() => {
      api<{ data: MissingPerson[] }>(`/api/missing?${params}`)
        .then((res) => {
          if (stale) return;
          setPeople(res.data);
          setError('');
        })
        .catch((e) => !stale && setError(e.message));
    }, query ? 300 : 0);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [status, query]);

  const tabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'missing', label: 'Still missing' },
    { id: 'found', label: 'Found' },
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
                <h1 className="text-3xl font-bold text-foreground mb-1">Missing Persons</h1>
                <p className="text-muted-foreground text-sm">
                  Open a case to see details and sightings, or report that you have seen someone.
                </p>
              </div>
              <Link
                href="/register"
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Register missing person
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="flex gap-2">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setStatus(t.id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                      status === t.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative ml-auto w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or place"
                  className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            {people === null && !error && <p className="text-muted-foreground">Loading…</p>}
            {people?.length === 0 && (
              <p className="text-muted-foreground">No cases match this filter.</p>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {people?.map((p) => {
                const found = p.status === 'found';
                return (
                  <Link
                    key={p._id}
                    href={`/cases/${p._id}`}
                    className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent transition group"
                  >
                    <div className="relative">
                      <img
                        src={p.images[0] || '/placeholder-user.jpg'}
                        alt={p.name}
                        className="w-full h-52 object-cover group-hover:scale-[1.02] transition-transform"
                      />
                      <Badge
                        className={`absolute top-3 right-3 border-0 ${
                          found ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}
                      >
                        {found ? 'Found' : 'Missing'}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {p.age != null ? `${p.age} yrs` : 'Age unknown'}
                        {p.gender && p.gender !== 'unknown' ? ` · ${p.gender}` : ''}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {p.lastSeenLocation || 'Unknown location'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Reported {timeAgo(p.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CasesPage() {
  return (
    <ProtectedRoute>
      <CasesContent />
    </ProtectedRoute>
  );
}
