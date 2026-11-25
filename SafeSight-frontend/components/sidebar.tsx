'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, MapPin, FileText, X, Users, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeCases, setActiveCases] = useState<number | null>(null);

  // The menu button lives in the navbar on phones; it toggles this drawer
  useEffect(() => {
    const toggle = () => setIsOpen((v) => !v);
    window.addEventListener('safesight:toggle-sidebar', toggle);
    return () => window.removeEventListener('safesight:toggle-sidebar', toggle);
  }, []);

  // Close the drawer when the page changes
  useEffect(() => setIsOpen(false), [pathname]);

  useEffect(() => {
    api<{ activeCases: number }>('/api/stats')
      .then((s) => setActiveCases(s.activeCases))
      .catch(() => setActiveCases(null));
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/cases', label: 'Missing Persons', icon: Users },
    { href: '/sightings', label: 'Sightings', icon: Eye },
    { href: '/register', label: 'Register Missing', icon: Plus },
    { href: '/report', label: 'Report Found', icon: FileText },
    { href: '/map', label: 'Map', icon: MapPin },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Dark backdrop behind the drawer on phones; tap to close */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} aria-hidden />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 z-50 md:z-auto md:sticky md:translate-x-0 flex-shrink-0 overflow-y-auto print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between px-6 pt-5 md:hidden">
          <span className="font-bold text-lg text-sidebar-foreground">Menu</span>
          <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-sidebar-accent" aria-label="Close menu">
            <X className="w-5 h-5 text-sidebar-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-8">
          <div className="hidden md:block">
            <h2 className="text-xs font-semibold text-sidebar-foreground uppercase tracking-wider mb-4">
              Navigation
            </h2>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive(href)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-sidebar-border pt-6">
            <div className="bg-sidebar-primary/10 border border-sidebar-border rounded-lg p-4">
              <p className="text-sm text-sidebar-foreground font-semibold mb-2">
                Missing Cases
              </p>
              <p className="text-2xl font-bold text-sidebar-primary">{activeCases ?? '—'}</p>
              <p className="text-xs text-sidebar-foreground opacity-70 mt-1">Active cases</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
