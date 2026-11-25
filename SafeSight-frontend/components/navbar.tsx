'use client';

import { Search, LogOut, Settings, Eye, X, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useRef, useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [q, setQ] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user menu when tapping/clicking anywhere else
  useEffect(() => {
    if (!showUserMenu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showUserMenu]);

  // Search goes to the Missing Persons page (name or place)
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    setMobileSearch(false);
    if (pathname === '/cases') {
      window.dispatchEvent(new CustomEvent('safesight:search', { detail: term }));
    } else {
      router.push(term ? `/cases?q=${encodeURIComponent(term)}` : '/cases');
    }
  };

  const searchBox = (autoFocus = false) => (
    <form
      onSubmit={submitSearch}
      role="search"
      className="flex items-center gap-2 bg-secondary rounded-lg px-4 py-2 w-full"
    >
      <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Search missing persons by name or place…"
        aria-label="Search missing persons"
        className="bg-transparent outline-none text-sm text-foreground placeholder-muted-foreground w-full"
      />
    </form>
  );

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-40 shadow-lg print:hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1">
        {isAuthenticated && (
          <button
            onClick={() => window.dispatchEvent(new Event('safesight:toggle-sidebar'))}
            className="md:hidden p-2 -ml-2 hover:bg-secondary rounded-lg"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        )}
        <Link href={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">S</span>
          </div>
          <span className="font-bold text-lg text-foreground">SafeSight</span>
        </Link>
        </div>

        {isAuthenticated && <div className="hidden md:flex flex-1 max-w-md">{searchBox()}</div>}

        <div className="flex items-center gap-1 sm:gap-3">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => setMobileSearch((v) => !v)}
                className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
                aria-label="Search"
              >
                {mobileSearch ? <X className="w-5 h-5 text-foreground" /> : <Search className="w-5 h-5 text-foreground" />}
              </button>
              <Link
                href="/sightings"
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                aria-label="Latest sightings"
                title="Latest sightings"
              >
                <Eye className="w-5 h-5 text-foreground" />
              </Link>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors flex items-center gap-2"
                  aria-label="Account menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden lg:inline text-sm text-foreground max-w-32 truncate">{user?.name}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="font-medium text-foreground text-sm truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-1">{user?.role}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4 inline mr-2" />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                        router.push('/login');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-secondary transition"
                    >
                      <LogOut className="w-4 h-4 inline mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-foreground hover:text-accent transition font-medium text-sm">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      {isAuthenticated && mobileSearch && <div className="md:hidden px-4 pb-3">{searchBox(true)}</div>}
    </nav>
  );
}
