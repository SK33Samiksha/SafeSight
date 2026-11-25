'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import Sidebar from '@/components/sidebar';
import { ImageUpload } from '@/components/image-upload';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { api, uploadImage } from '@/lib/api';

function RegisterMissingContent() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: '',
    lastSeen: '',
    dateTime: '',
    description: '',
  });
  const [images, setImages] = useState<File[]>([]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
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
      const uploadedImages = await Promise.all(images.map(uploadImage));

      const res = await api<{ data: { _id: string }; skippedPhotos: { reason: string }[]; geocoded: boolean }>(
        '/api/missing',
        {
          method: 'POST',
          body: JSON.stringify({
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            age: formData.age === '' ? undefined : Number(formData.age),
            gender: formData.gender,
            description: formData.description,
            lastSeenLocation: formData.lastSeen,
            lastSeenDate: formData.dateTime,
            images: uploadedImages,
          }),
        }
      );

      const notes: string[] = [];
      if (res.skippedPhotos?.length) {
        notes.push(`${res.skippedPhotos.length} photo(s) had no detectable face and were not used for matching.`);
      }
      if (!res.geocoded) {
        notes.push('The location could not be found on the map; try a more specific place name.');
      }
      if (notes.length) alert(notes.join('\n'));

      router.push(`/cases/${res.data._id}`);
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
              <h1 className="text-3xl font-bold text-foreground mb-2">Register Missing Person</h1>
              <p className="text-muted-foreground">
                Help us find your loved one. Please provide accurate details and clear photos.
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
                {/* Personal Information Section */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-6">Personal Information</h2>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter first name"
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter last name"
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Age *
                      </label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter age"
                        min="0"
                        max="120"
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Gender *
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location & Time Section */}
                <div className="border-t border-border pt-8">
                  <h2 className="text-lg font-semibold text-foreground mb-6">Last Seen Details</h2>

                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Location *
                      </label>
                      <input
                        type="text"
                        name="lastSeen"
                        value={formData.lastSeen}
                        onChange={handleInputChange}
                        required
                        placeholder="Enter location details"
                        className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>

                    <div>
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Additional Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      placeholder="Provide any additional details (clothing, distinguishing features, etc.)"
                      rows={4}
                      className="w-full bg-secondary border border-border rounded-lg px-4 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition resize-none"
                    />
                  </div>
                </div>

                {/* Photo Upload Section */}
                <div className="border-t border-border pt-8">
                  <h2 className="text-lg font-semibold text-foreground mb-6">Upload Photos</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                    Clear, recent photos help improve AI matching accuracy. Upload at least one photo.
                  </p>
                  <ImageUpload onImagesSelected={handleImagesSelected} multiple={true} />
                </div>

                {/* Submit Section */}
                <div className="border-t border-border pt-8">
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
                      disabled={isSubmitting || !formData.firstName || !formData.lastName || images.length === 0}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Report <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function RegisterMissing() {
  return (
    <ProtectedRoute>
      <RegisterMissingContent />
    </ProtectedRoute>
  );
}
