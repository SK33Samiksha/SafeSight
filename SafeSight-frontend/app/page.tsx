import Link from 'next/link';
import { ArrowRight, Zap, Map, Brain, Bell } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-lg text-foreground">SafeSight</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-accent transition">
              Features
            </a>
            <a href="#how" className="text-foreground hover:text-accent transition">
              How It Works
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-foreground hover:text-accent transition font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg transition-colors font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center space-y-6 mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground text-balance leading-tight">
              Find the Missing.
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Reunite Families.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              SafeSight uses advanced AI face matching and real-time reporting to help find missing persons and reconnect families. Anyone can report a sighting in seconds, from any phone or computer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link
                href="/register"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
              >
                Register Missing Person <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/report"
                className="border border-primary text-primary hover:bg-primary/5 px-8 py-3 rounded-lg transition-colors font-semibold"
              >
                Report Found Person
              </Link>
            </div>
          </div>

          <div className="mt-16 rounded-2xl overflow-hidden border border-border shadow-2xl bg-card p-8">
            <div className="aspect-video bg-gradient-to-br from-secondary to-primary/20 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Brain className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-foreground font-semibold">AI-Powered Match Detection</p>
                <p className="text-muted-foreground text-sm mt-2">Real results from real data</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-muted-foreground text-lg">Everything you need to find the missing</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary hover:shadow-lg transition-all">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">AI Face Matching</h3>
              <p className="text-muted-foreground text-sm">
                Advanced facial recognition to find potential matches instantly
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary hover:shadow-lg transition-all">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">Real-time Reporting</h3>
              <p className="text-muted-foreground text-sm">
                Anyone can report a sighting from their phone; it appears on the case right away
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary hover:shadow-lg transition-all">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Map className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">Interactive Map</h3>
              <p className="text-muted-foreground text-sm">
                Track missing persons and sightings on a live map
              </p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border hover:border-primary hover:shadow-lg transition-all">
              <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">Smart Alerts</h3>
              <p className="text-muted-foreground text-sm">
                Get notified when matches or updates occur in your area
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">Three simple steps to find the missing</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Upload',
                description: 'Submit photos and details of the missing person',
              },
              {
                step: 2,
                title: 'AI Matching',
                description: 'Our AI analyzes images against thousands of reports',
              },
              {
                step: 3,
                title: 'Get Results',
                description: 'Receive instant matches with confidence scores',
              },
            ].map(({ step, title, description }) => (
              <div key={step} className="relative">
                <div className="bg-card rounded-xl p-8 border border-border h-full">
                  <div className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-4">
                    {step}
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-3">{title}</h3>
                  <p className="text-muted-foreground">{description}</p>
                </div>
                {step < 3 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-y border-border">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ready to Help?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every second counts. Start reporting or registering now and help bring missing persons home.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
            >
              Register Missing <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/report"
              className="border border-primary text-primary hover:bg-primary/5 px-8 py-3 rounded-lg transition-colors font-semibold"
            >
              Report Found
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">S</span>
                </div>
                <span className="font-bold text-foreground">SafeSight</span>
              </div>
              <p className="text-muted-foreground text-sm">
                AI-powered missing person detection platform
              </p>
            </div>

            {[
              {
                title: 'Use SafeSight',
                links: [
                  { label: 'Missing persons', href: '/cases' },
                  { label: 'Sightings map', href: '/map' },
                  { label: 'Register a missing person', href: '/register' },
                  { label: 'Report a sighting', href: '/report' },
                ],
              },
              {
                title: 'Learn',
                links: [
                  { label: 'Features', href: '#features' },
                  { label: 'How it works', href: '#how' },
                  { label: 'About the project', href: '/about' },
                ],
              },
              {
                title: 'Legal',
                links: [
                  { label: 'Privacy', href: '/about#privacy' },
                  { label: 'Important notice', href: '/about#notice' },
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-semibold text-foreground mb-3">{title}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-muted-foreground hover:text-accent transition text-sm">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-muted-foreground text-sm text-center">
              © 2026 SafeSight · Student project. In an emergency, always contact the police (dial 112 in India).
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
