'use client';

import React from 'react';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/lib/auth-context';
import { Mail, Shield, Users, Settings, LogOut } from 'lucide-react';

function ProfileContent() {
  const { user, logout } = useAuth();

  const roleInfo = {
    citizen: {
      title: 'Citizen',
      description: 'Report sightings and help find missing persons in your community',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-500',
    },
    family: {
      title: 'Family Member',
      description: 'Register missing loved ones and follow sightings and AI matches on their case',
      icon: Users,
      color: 'bg-pink-500/10 text-pink-500',
    },
    admin: {
      title: 'Administrator',
      description: 'Manage cases, verify reports, and oversee the platform',
      icon: Shield,
      color: 'bg-purple-500/10 text-purple-500',
    },
  };

  const info = roleInfo[user?.role || 'citizen'];
  const Icon = info.icon;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-2xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Profile Settings</h1>
              <p className="text-muted-foreground">Manage your account and preferences</p>
            </div>

            {/* Profile Card */}
            <div className="bg-card rounded-xl border border-border p-8 mb-6">
              {/* Avatar & Name */}
              <div className="flex items-start gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  {user?.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground">{user?.name}</h2>
                  <p className="text-muted-foreground mt-1">{user?.email}</p>
                </div>
              </div>

              {/* Role Info */}
              <div className={`rounded-lg p-6 mb-8 ${info.color}`}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-6 h-6" />
                  <h3 className="font-semibold text-lg">{info.title}</h3>
                </div>
                <p className="text-sm opacity-90">{info.description}</p>
              </div>

              {/* Account Details */}
              <div className="border-t border-border pt-8">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-accent" />
                  Account Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground">{user?.email}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Account Type
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <p className="text-foreground capitalize">{user?.role}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Member Since
                    </label>
                    <p className="p-3 bg-secondary rounded-lg text-foreground">
                      {new Date(user?.createdAt ?? Date.now()).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-500" />
                Sign Out
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Click below to sign out of your SafeSight account.
              </p>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/';
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
