'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { ImageUpload } from '@/components/image-upload';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, Eye } from 'lucide-react';
import { api, uploadImage } from '@/lib/api';

function ReportFoundContent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    location: '',
    dateTime: '',
    description: '',
  });
  const [images, setImages] = useState<File[]>([]);
  // Set when coming from a case page ("I've seen this person")
  const [linkedCase, setLinkedCase] = useState<{ _id: string; name: string; images: string[] } | null>(null);

  useEffect(() => {
    const caseId = new URLSearchParams(window.location.search).get('case');
    if (!caseId) return;
    api<{ data: { _id: string; name: string; images: string[] } }>(`/api/missing/${caseId}`)
      .then((res) => setLinkedCase(res.data))
      .catch(() => setError('That case could not be found.'));
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagesSelected = (files: File[]) => {
    setImages(files);
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (!images[0] && !linkedCase) throw new Error('Please add a photo');

      // 1. Upload the photo to Cloudinary (via the backend), if there is one
      const imageUrl = images[0] ? await uploadImage(images[0]) : '';

      // 2. Run AI face matching and save the sighting
      const data = await api<{ matches: unknown[]; aiNote?: string }>('/api/found', {
        method: 'POST',
        body: JSON.stringify({
          image: imageUrl,
          location: formData.location,
          dateTime: formData.dateTime,
          description: formData.description,
          missingPersonId: linkedCase?._id,
        }),
      });

      // Sighting of a known case: go back to that case, where it now appears
      if (linkedCase) {
        if (data.aiNote) alert(`Sighting saved. Note about the photo: ${data.aiNote}`);
        router.push(`/cases/${linkedCase._id}`);
        return;
      }

      // Pass results to the next page via sessionStorage (not the URL)
      sessionStorage.setItem(
        'safesight_matches',
        JSON.stringify({ matches: data.matches, image: imageUrl, location: formData.location })
      );
      router.push('/match-results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
          <div className="max-w-3xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {linkedCase ? 'Report a Sighting' : 'Report Found Person'}
              </h1>
              <p className="text-muted-foreground">
                {linkedCase
                  ? 'Tell the family where and when you saw this person.'
                  : 'Help reunite families. Report a person you believe may be missing.'}
              </p>
            </div>

            {linkedCase && (
              <div className="flex items-center gap-4 bg-card border border-primary/40 rounded-xl p-4 mb-6">
                <img
                  src={linkedCase.images[0] || '/placeholder-user.jpg'}
                  alt={linkedCase.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3 h-3" /> You are reporting a sighting of
                  </p>
                  <p className="text-lg font-semibold text-foreground">{linkedCase.name}</p>
                </div>
              </div>
            )}

            {/* Info Alert */}
            <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-8">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Our AI will automatically match</span> the photos you upload against all missing person reports in our database.
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-card rounded-xl border border-border p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {error && (
                  <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}
                {/* Photo Upload Section - First */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-6">
                    Upload Photo {linkedCase && <span className="text-sm font-normal text-muted-foreground">(optional)</span>}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Clear photos of the person&apos;s face are crucial for accurate AI matching.
                  </p>
                  <ImageUpload onImagesSelected={handleImagesSelected} multiple={false} />
                </div>

                {/* Location & Time Section */}
                <div className="border-t border-border pt-8">
                  <h2 className="text-lg font-semibold text-foreground mb-6">Sighting Details</h2>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      placeholder="Where did you see this person?"
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="dateTime"
                      value={formData.dateTime}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Additional Information
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Describe clothing, distinctive features, behavior, or any other details that might help identify this person"
                      rows={4}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
                    />
                  </div>
                </div>

                {/* Submit Section */}
                <div className="border-t border-border pt-8 bg-secondary/50 -m-8 mt-0 p-8 rounded-b-xl">
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      onClick={() => router.back()}
                      variant="outline"
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
  type="submit"
  disabled={isSubmitting || !formData.location || (images.length === 0 && !linkedCase)}
  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
>
  {isSubmitting ? (
    <>
      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
      Processing report...
    </>
  ) : (
    <>
      Submit Report <ArrowRight className="w-4 h-4" />
    </>
  )}
</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Our AI will analyze the photo and search for matches in our database
                  </p>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ReportFound() {
  return (
    <ProtectedRoute>
      <ReportFoundContent />
    </ProtectedRoute>
  );
}
