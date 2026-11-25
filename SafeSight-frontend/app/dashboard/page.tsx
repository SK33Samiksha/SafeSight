'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, timeAgo } from '@/lib/api';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { StatCard } from '@/components/stat-card';
import { MatchCard } from '@/components/match-card';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import {
  Users,
  CheckCircle,
  Zap,
  AlertCircle,
} from 'lucide-react';

interface Stats {
  totalMissing: number;
  activeCases: number;
  matchedReports: number;
  reportsToday: number;
  activity: { type: 'report' | 'match'; title: string; description: string; time: string; link?: string }[];
  recentMatches: { id: string; name: string; age?: number; image: string; confidence: number; location?: string }[];
}

function DashboardContent() {
  const { user } = useAuth();
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Stats>('/api/stats').then(setData).catch((e) => setError(e.message));
  }, []);

  const v = (n?: number) => (n == null ? '—' : String(n));
  const stats = [
    { title: 'Total Missing', value: v(data?.totalMissing), icon: Users, href: '/cases' },
    { title: 'Active Cases', value: v(data?.activeCases), icon: AlertCircle, href: '/cases?status=missing' },
    { title: 'Matched Sightings', value: v(data?.matchedReports), icon: CheckCircle, href: '/sightings?status=matched' },
    { title: 'Reports Today', value: v(data?.reportsToday), icon: Zap, href: '/sightings?today=1' },
  ];
  const recentMatches = data?.recentMatches ?? [];
  const recentActivity = (data?.activity ?? []).map((a) => ({
    ...a,
    time: timeAgo(a.time),
    icon: a.type === 'match' ? CheckCircle : AlertCircle,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back, <span className="capitalize font-semibold text-accent">{user?.name}</span> ({user?.role}). Here&apos;s what&apos;s happening today.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
              {stats.map((stat, i) => (
                <StatCard key={i} {...stat} />
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Recent Activity */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-semibold text-foreground text-lg mb-4">Recent Activity</h2>

                  <div className="space-y-4">
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {data && recentActivity.length === 0 && (
                      <p className="text-sm text-muted-foreground">No activity yet.</p>
                    )}
                    {recentActivity.map((activity, i) => {
                      const Icon = activity.icon;
                      return (
                        <Link
                          key={i}
                          href={activity.link || '/sightings'}
                          className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0 hover:bg-secondary/50 rounded-lg -mx-2 px-2 pt-2 transition"
                        >
                          <div className="bg-secondary rounded-lg p-2 flex-shrink-0">
                            <Icon className="w-4 h-4 text-accent" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground truncate">
                              {activity.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {activity.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">{activity.time}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Matches */}
              <div className="lg:col-span-2">
                <div className="mb-6">
                  <h2 className="font-semibold text-foreground text-lg mb-4">Recent AI Matches</h2>
                  {data && recentMatches.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No AI matches yet. Matches appear here when a reported sighting matches a registered missing person.
                    </p>
                  )}
                  <div className="grid md:grid-cols-2 gap-6">
                    {recentMatches.slice(0, 4).map((match) => (
                      <MatchCard key={match.id} {...match} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
