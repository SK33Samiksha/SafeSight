'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { MatchCard } from '@/components/match-card';
import { ProtectedRoute } from '@/components/protected-route';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

interface Match {
  id: string;
  name: string;
  age?: number;
  image: string;
  gender?: string;
  confidence: number;
  location?: string;
}

function MatchResultsContent() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[] | null>(null);

  useEffect(() => {
    try {
      const raw = JSON.parse(sessionStorage.getItem('safesight_matches') || '{}');
      setMatches(
        (raw.matches || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          age: m.age,
          image: m.image,
          gender: m.gender,
          confidence: m.confidence,
          location: m.lastSeen,
        }))
      );
    } catch {
      setMatches([]);
    }
  }, []);

  if (matches === null) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-primary hover:text-primary/80 font-medium mb-8 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">AI Match Results</h1>
                  <p className="text-muted-foreground mt-1">
                   {matches.length ? `Found ${matches.length} potential match${matches.length > 1 ? 'es' : ''}` : 'No potential matches found'}
                  </p>
                </div>
              </div>
            </div>

            {/* Results Info */}
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-foreground text-sm">How these results work</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Our AI uses advanced facial recognition to match uploaded photos against our database of missing person reports. Confidence scores indicate the likelihood of a match. Higher scores are more reliable, but always verify independently.
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence Score Legend */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-card rounded-lg p-4 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">HIGH CONFIDENCE</p>
                <p className="text-2xl font-bold text-green-500">90-100%</p>
                <p className="text-xs text-muted-foreground mt-2">Very likely match</p>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">MODERATE CONFIDENCE</p>
                <p className="text-2xl font-bold text-yellow-500">70-89%</p>
                <p className="text-xs text-muted-foreground mt-2">Probable match</p>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">LOW CONFIDENCE</p>
                <p className="text-2xl font-bold text-orange-500">50-69%</p>
                <p className="text-xs text-muted-foreground mt-2">Possible match</p>
              </div>
            </div>

            {/* Matches Grid */}
            <div className="mb-12">
              <h2 className="text-xl font-semibold text-foreground mb-6">Top Matches</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {matches.length > 0 ? (
  matches.map((match: Match) => (
    <MatchCard key={match.id} {...match} />
  ))
) : (
  <p className="text-muted-foreground">
    No registered missing person matched this photo closely enough. The sighting has
    been saved and will be visible to investigators.
  </p>
)}
              </div>
            </div>

            {/* Action Section */}
            <div className="border-t border-border pt-8">
              <h2 className="text-xl font-semibold text-foreground mb-6">Next Steps</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <Link
                  href="/dashboard"
                  className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-lg transition-all"
                >
                  <h3 className="font-semibold text-foreground text-lg mb-2">View Dashboard</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Return to the dashboard to see all your reports and tracked cases.
                  </p>
                  <span className="text-primary text-sm font-medium">Go to Dashboard →</span>
                </Link>

                <Link
                  href="/map"
                  className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-lg transition-all"
                >
                  <h3 className="font-semibold text-foreground text-lg mb-2">View on Map</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    See the locations of these matches on an interactive map.
                  </p>
                  <span className="text-primary text-sm font-medium">View Map →</span>
                </Link>
              </div>

              <div className="mt-6 bg-secondary/30 border border-border rounded-xl p-6">
                <p className="text-foreground font-semibold mb-2">Found a match?</p>
                <p className="text-muted-foreground text-sm mb-4">
                  If you believe you&apos;ve found the person, please contact local authorities immediately with details and any additional information.
                </p>
                <button className="text-primary hover:text-primary/80 text-sm font-semibold transition">
                  Report to Authorities →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function MatchResults() {
  return (
    <ProtectedRoute>
      <MatchResultsContent />
    </ProtectedRoute>
  );
}
