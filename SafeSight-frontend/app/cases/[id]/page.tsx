'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Mail, User, CheckCircle, Share2, Printer, Eye, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface MissingPerson {
  _id: string;
  name: string;
  age?: number;
  gender?: string;
  description?: string;
  lastSeenLocation?: string;
  lastSeenDate?: string;
  coords?: { lat: number; lng: number };
  images: string[];
  status?: 'missing' | 'found';
  reportedBy?: { _id: string; name: string; email: string };
  createdAt: string;
}

interface Sighting {
  id: string;
  image: string;
  location?: string;
  seenAt: string;
  description?: string;
  confidence?: number;
  manual?: boolean;
  reportedBy?: { _id: string; name: string } | null;
}

interface EditForm {
  name: string;
  age: string;
  gender: string;
  lastSeenLocation: string;
  lastSeenDate: string;
  description: string;
}

// yyyy-MM-ddTHH:mm in local time, for <input type="datetime-local">
const toLocalInput = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

function CaseDetailsContent() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [person, setPerson] = useState<MissingPerson | null>(null);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [saveError, setSaveError] = useState('');

  const load = useCallback(() => {
    api<{ data: MissingPerson; sightings: Sighting[] }>(`/api/missing/${id}`)
      .then((res) => {
        setPerson(res.data);
        setSightings(res.sightings);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(load, [load]);

  const canEdit =
    !!person && !!user && (user.role === 'admin' || person.reportedBy?._id === user.id);

  const toggleStatus = async () => {
    if (!person) return;
    setUpdating(true);
    try {
      const status = person.status === 'found' ? 'missing' : 'found';
      await api(`/api/missing/${person._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const startEdit = () => {
    if (!person) return;
    setSaveError('');
    setEditing({
      name: person.name,
      age: person.age != null ? String(person.age) : '',
      gender: person.gender && person.gender !== 'unknown' ? person.gender : '',
      lastSeenLocation: person.lastSeenLocation || '',
      lastSeenDate: toLocalInput(person.lastSeenDate),
      description: person.description || '',
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !editing) return;
    setUpdating(true);
    setSaveError('');
    try {
      const res = await api<{ geocoded: boolean }>(`/api/missing/${person._id}`, {
        method: 'PATCH',
        body: JSON.stringify(editing),
      });
      if (!res.geocoded) alert('Saved. The new location could not be found on the map; try a more specific place name.');
      setEditing(null);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setUpdating(false);
    }
  };

  const deleteCase = async () => {
    if (!person) return;
    if (!confirm(`Delete the case for ${person.name}? This cannot be undone.`)) return;
    try {
      await api(`/api/missing/${person._id}`, { method: 'DELETE' });
      router.push('/cases');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const deleteSighting = async (sightingId: string) => {
    if (!confirm('Delete this sighting report?')) return;
    try {
      await api(`/api/found/${sightingId}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `Missing: ${person?.name}`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-foreground">
        <p>{error}</p>
      </div>
    );
  }
  if (!person) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        Loading case…
      </div>
    );
  }

  const isFound = person.status === 'found';
  const timeline = [
    {
      date: person.createdAt,
      type: 'missing',
      title: 'Reported missing',
      description: `Registered by ${person.reportedBy?.name ?? 'a user'}`,
    },
    ...sightings.map((s) => ({
      date: s.seenAt,
      type: 'sighting',
      title: s.manual ? 'Sighting reported by a user' : `Possible sighting (${s.confidence ?? '?'}% AI match)`,
      description: [s.location, s.description].filter(Boolean).join(' — ') || 'Reported via AI match',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium mb-8 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* On phones the name comes first, above the photo */}
            <div className="lg:hidden mb-5">
              <h1 className="text-3xl font-bold text-foreground mb-2">{person.name}</h1>
              <Badge
                className={`${isFound ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'} border-0`}
              >
                {isFound ? 'Found' : 'Active Case'}
              </Badge>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 mb-8">
              {/* Photos + contact */}
              <div className="lg:col-span-1">
                <div className="rounded-xl overflow-hidden border border-border shadow-lg mb-3">
                  <img
                    src={person.images[activeImage] || '/placeholder.svg'}
                    alt={person.name}
                    className="w-full h-72 sm:h-96 object-cover"
                  />
                </div>
                {person.images.length > 1 && (
                  <div className="flex gap-2 mb-6">
                    {person.images.map((img, i) => (
                      <button
                        key={img}
                        onClick={() => setActiveImage(i)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                          i === activeImage ? 'border-primary' : 'border-border'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="bg-card rounded-xl border border-border p-6 space-y-4 mt-6">
                  <p className="text-xs font-semibold text-muted-foreground">Reported by</p>
                  <div className="flex items-center gap-3 bg-secondary rounded-lg p-3">
                    <User className="w-4 h-4 text-accent flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      {person.reportedBy?.name ?? 'Unknown'}
                    </span>
                  </div>
                  {person.reportedBy?.email && (
                    <div className="flex items-center gap-3 bg-secondary rounded-lg p-3">
                      <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                      <a
                        href={`mailto:${person.reportedBy.email}`}
                        className="text-sm text-primary hover:text-primary/80 transition truncate"
                      >
                        {person.reportedBy.email}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={share}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 border border-border hover:bg-secondary text-foreground py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>

                {!isFound && (
                  <Link
                    href={`/report?case=${person._id}`}
                    className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground py-3 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    I&apos;ve seen this person
                  </Link>
                )}

                {canEdit && (
                  <button
                    onClick={toggleStatus}
                    disabled={updating}
                    className="w-full mt-3 border border-green-500/40 text-green-500 hover:bg-green-500/10 py-2 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isFound ? 'Re-open case' : 'Mark as found'}
                  </button>
                )}

                {canEdit && (
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={startEdit}
                      className="flex-1 border border-border hover:bg-secondary text-foreground py-2 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <button
                      onClick={deleteCase}
                      className="flex-1 border border-red-500/40 text-red-500 hover:bg-red-500/10 py-2 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="lg:col-span-2">
                {editing ? (
                  <form onSubmit={saveEdit} className="bg-card rounded-xl border border-border p-4 sm:p-6 space-y-4">
                    <h2 className="text-xl font-bold text-foreground">Edit case</h2>
                    {saveError && <p className="text-sm text-red-500">{saveError}</p>}
                    <label className="block text-sm font-medium text-foreground">
                      Full name
                      <input
                        required
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                        className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                      />
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="block text-sm font-medium text-foreground">
                        Age
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={editing.age}
                          onChange={(e) => setEditing({ ...editing, age: e.target.value })}
                          className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                        />
                      </label>
                      <label className="block text-sm font-medium text-foreground">
                        Gender
                        <select
                          value={editing.gender}
                          onChange={(e) => setEditing({ ...editing, gender: e.target.value })}
                          className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                        >
                          <option value="">Unknown</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </label>
                    </div>
                    <label className="block text-sm font-medium text-foreground">
                      Last seen location
                      <input
                        value={editing.lastSeenLocation}
                        onChange={(e) => setEditing({ ...editing, lastSeenLocation: e.target.value })}
                        className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                      />
                    </label>
                    <label className="block text-sm font-medium text-foreground">
                      Last seen date &amp; time
                      <input
                        type="datetime-local"
                        value={editing.lastSeenDate}
                        onChange={(e) => setEditing({ ...editing, lastSeenDate: e.target.value })}
                        className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                      />
                    </label>
                    <label className="block text-sm font-medium text-foreground">
                      Description
                      <textarea
                        rows={4}
                        value={editing.description}
                        onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                        className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground"
                      />
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={updating}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                      >
                        {updating ? 'Saving…' : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="flex-1 border border-border hover:bg-secondary text-foreground py-2 rounded-lg font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                <>
                <div className="mb-6 hidden lg:block">
                  <h1 className="text-4xl font-bold text-foreground mb-2">{person.name}</h1>
                  <Badge
                    className={`${
                      isFound ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    } border-0`}
                  >
                    {isFound ? 'Found' : 'Active Case'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
                  <div className="bg-secondary rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">AGE</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{person.age ?? 'N/A'}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">GENDER</p>
                    <p className="text-2xl font-bold text-foreground capitalize">
                      {person.gender ?? 'Unknown'}
                    </p>
                  </div>
                  <div className="bg-secondary rounded-lg p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">CASE ID</p>
                    <p className="text-sm font-bold text-foreground break-all">
                      #{person._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="bg-accent/10 border border-accent/20 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-accent/20 p-3 rounded-lg flex-shrink-0">
                      <MapPin className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold text-foreground mb-2">Last Seen</h2>
                      <p className="text-foreground mb-2">
                        {person.lastSeenLocation || 'Unknown location'}
                      </p>
                      <p className="text-muted-foreground text-sm">{fmt(person.lastSeenDate)}</p>
                      {person.coords && (
                        <p className="text-muted-foreground text-xs mt-2">
                          {person.coords.lat.toFixed(4)}, {person.coords.lng.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-semibold text-foreground mb-4">Description</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {person.description || 'No additional description available.'}
                  </p>
                </div>
                </>
                )}
              </div>
            </div>

            {/* Sightings */}
            {sightings.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Sightings ({sightings.length})
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {sightings.map((s) => (
                    <div key={s.id} className="bg-card rounded-xl border border-border overflow-hidden">
                      {s.image ? (
                        <img src={s.image} alt="Sighting" className="w-full h-40 object-cover" />
                      ) : (
                        <div className="w-full h-40 bg-secondary flex items-center justify-center text-muted-foreground text-sm">
                          No photo
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Eye className="w-4 h-4 text-accent" />
                          {s.manual ? 'Reported by a user' : `${s.confidence ?? '?'}% AI match`}
                        </p>
                        <p className="text-sm text-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {s.location || 'Unknown place'}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmt(s.seenAt)}</p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{s.description}</p>
                        )}
                        {s.reportedBy?.name && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <User className="w-3 h-3" /> {s.reportedBy.name}
                          </p>
                        )}
                        {user && (user.role === 'admin' || s.reportedBy?._id === user.id) && (
                          <button
                            onClick={() => deleteSighting(s.id)}
                            className="mt-3 text-xs text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete report
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Case Timeline</h2>
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {timeline.map((item, index) => (
                    <div key={index} className="relative pl-20">
                      <div
                        className={`absolute left-0 top-1.5 w-12 h-12 rounded-full border-4 border-background flex items-center justify-center ${
                          item.type === 'missing' ? 'bg-red-500' : 'bg-cyan-500'
                        }`}
                      >
                        <span className="text-white font-bold text-lg">
                          {item.type === 'missing' ? '!' : '👁'}
                        </span>
                      </div>
                      <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-foreground">{item.title}</h3>
                          <span className="text-xs font-medium text-muted-foreground">
                            {new Date(item.date).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Link
              href="/map"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium"
            >
              <MapPin className="w-4 h-4" /> View on map
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function CaseDetails() {
  return (
    <ProtectedRoute>
      <CaseDetailsContent />
    </ProtectedRoute>
  );
}
