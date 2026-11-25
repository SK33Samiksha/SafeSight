import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Brain, ShieldCheck, AlertTriangle, Map } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About & Privacy — SafeSight',
  description: 'What SafeSight is, how the face matching works, and how photos and personal data are handled.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">About SafeSight</h1>
        <p className="text-muted-foreground text-lg mb-10">
          SafeSight helps families and the public share information about missing persons. Families
          register a missing person with photos; anyone who spots someone can report a sighting, and
          AI face matching suggests which registered person it might be.
        </p>

        <section id="notice" className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 sm:p-6 mb-10 scroll-mt-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" /> Important notice
          </h2>
          <p className="text-sm text-muted-foreground">
            SafeSight is a student project and does not replace the police. If someone is missing or in
            danger, contact the police immediately (dial <strong>112</strong> in India). AI matches are
            suggestions only and can be wrong — never approach or detain anyone based on a match.
          </p>
        </section>

        <div className="space-y-10">
          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-3">
              <Brain className="w-5 h-5 text-accent" /> How the face matching works
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
              <li>Each photo is analysed by FaceNet, a neural network that turns a face into a list of 128 numbers (an “embedding”).</li>
              <li>When a sighting photo is reported, its embedding is compared with every active case using cosine distance.</li>
              <li>Only close matches are shown (the best three), with a confidence score. Photos without a clearly visible face are rejected.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-3">
              <Map className="w-5 h-5 text-accent" /> Map and hotspots
            </h2>
            <p className="text-muted-foreground text-sm">
              Place names are converted to map coordinates with OpenStreetMap. The map groups last-seen
              locations with KMeans clustering to highlight areas with several missing-person reports.
            </p>
          </section>

          <section id="privacy" className="scroll-mt-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-3">
              <ShieldCheck className="w-5 h-5 text-accent" /> Privacy
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm">
              <li>Case details and sightings are visible only to signed-in users.</li>
              <li>Photos are stored on Cloudinary; case and account data in MongoDB. Passwords are stored only as secure hashes.</li>
              <li>Face embeddings are used only for matching and are never shown or shared.</li>
              <li>The person who registered a case can edit or delete it at any time; deleting a case removes its photos’ embeddings from matching.</li>
              <li>Only upload photos you have the right to share, and only for the purpose of finding a missing person.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
