'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, MapPin, Trash2, User } from 'lucide-react';
import { api, timeAgo } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Sighting {
  _id: string;
  image?: string;
  location?: string;
  description?: string;
  seenAt?: string;
  createdAt: string;
  status: 'matched' | 'unmatched';
  reportedBy?: { _id: string; name: string } | null;
  matches: {
    missingPerson?: { _id: string; name: string; age?: number; images: string[] } | null;
    confidence?: number;
    manual?: boolean;
  }[];
}

type Filter = 'all' | 'matched' | 'unmatched' | 'today';

function SightingsContent() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<Sighting[] | null>(null);
  const [error, setError] = useState('');

  // Read ?status= / ?today= from the URL (dashboard links use them)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('today') === '1') setFilter('today');
    else if (q.get('status') === 'matched' || q.get('status') === 'unmatched') {
      setFilter(q.get('status') as Filter);
    }
  }, []);

  useEffect(() => {
    const query =
      filter === 'today' ? '?today=1' : filter === 'all' ? '' : `?status=${filter}`;
    window.history.replaceState(null, '', `/sightings${query}`);
    setItems(null);
    let stale = false; // ignore answers to an older filter
    api<{ data: Sighting[] }>(`/api/found${query}`)
      .then((res) => !stale && setItems(res.data))
      .catch((e) => !stale && setError(e.message));
    return () => {
      stale = true;
    };
  }, [filter]);

  const remove = async (id: string) => {
    if (!confirm('Delete this sighting report?')) return;
    try {
      await api(`/api/found/${id}`, { method: 'DELETE' });
      setItems((list) => list?.filter((x) => x._id !== id) ?? null);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const tabs: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'matched', label: 'Linked to a case' },
    { id: 'unmatched', label: 'No match yet' },
    { id: 'today', label: 'Today' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">Sightings</h1>
                <p className="text-muted-foreground text-sm">
                  Every report from people who saw someone — where, when, and which case it matches.
                </p>
              </div>
              <Link
                href="/report"
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
              >
                <FileText className="w-4 h-4" /> Report a sighting
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    filter === t.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            {items === null && !error && <p className="text-muted-foreground">Loading…</p>}
            {items?.length === 0 && <p className="text-muted-foreground">No sightings here yet.</p>}

            <div className="space-y-4">
              {items?.map((s) => {
                const linked = s.matches.filter((m) => m.missingPerson);
                return (
                  <div
                    key={s._id}
                    className="bg-card border border-border rounded-xl overflow-hidden flex flex-col sm:flex-row"
                  >
                    {s.image ? (
                      <img src={s.image} alt="Sighting" className="w-full sm:w-48 h-48 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-full sm:w-48 h-48 bg-secondary flex items-center justify-center text-sm text-muted-foreground flex-shrink-0">
                        No photo
                      </div>
                    )}

                    <div className="p-5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge
                          className={`border-0 ${
                            s.status === 'matched'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-yellow-500/20 text-yellow-600'
                          }`}
                        >
                          {s.status === 'matched' ? 'Linked to a case' : 'No match yet'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          reported {timeAgo(s.createdAt)}
                        </span>
                        {user && (user.role === 'admin' || s.reportedBy?._id === user.id) && (
                          <button
                            onClick={() => remove(s._id)}
                            className="ml-auto text-xs text-red-500 hover:underline flex items-center gap-1"
                            aria-label="Delete report"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>

                      <p className="text-foreground font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-accent flex-shrink-0" />
                        {s.location || 'Unknown place'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        Seen{' '}
                        {new Date(s.seenAt || s.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                      {s.reportedBy?.name && (
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <User className="w-4 h-4 flex-shrink-0" /> Reported by {s.reportedBy.name}
                        </p>
                      )}
                      {s.description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-3">{s.description}</p>
                      )}

                      {linked.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {linked.map((m) => (
                            <Link
                              key={m.missingPerson!._id}
                              href={`/cases/${m.missingPerson!._id}`}
                              className="flex items-center gap-2 bg-secondary hover:bg-secondary/70 rounded-lg pr-3 transition"
                            >
                              <img
                                src={m.missingPerson!.images?.[0] || '/placeholder-user.jpg'}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover"
                              />
                              <span className="text-sm text-foreground">{m.missingPerson!.name}</span>
                              <span className="text-xs font-semibold text-accent">
                                {m.manual ? 'reported' : `${m.confidence ?? '?'}%`}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SightingsPage() {
  return (
    <ProtectedRoute>
      <SightingsContent />
    </ProtectedRoute>
  );
}
