'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface ImageUploadProps {
  onImagesSelected: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
}

export function ImageUpload({ onImagesSelected, multiple = true, maxFiles = 10 }: ImageUploadProps) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Free preview memory when the component goes away
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p)), [previews]);

  const update = (files: File[]) => {
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
    onImagesSelected(files);
  };

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    setNotice(picked.length < list.length ? 'Some files were skipped because they are not images.' : '');
    let next = multiple ? [...images, ...picked] : picked.slice(0, 1);
    if (next.length > maxFiles) {
      next = next.slice(0, maxFiles);
      setNotice(`You can add up to ${maxFiles} photos.`);
    }
    update(next);
  };

  const removeImage = (index: number) => update(images.filter((_, i) => i !== index));

  return (
    <div>
      <div
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-xl p-6 sm:p-8 text-center hover:border-primary transition-all"
      >
        <div className="flex flex-col items-center justify-center">
          <div className="bg-primary/10 p-4 rounded-lg mb-4">
            <Upload className="w-6 h-6 text-primary" />
          </div>
          <p className="font-semibold text-foreground mb-1">
            <span className="hidden sm:inline">Drag and drop {multiple ? 'photos' : 'a photo'} here, or</span>
            <span className="sm:hidden">Add {multiple ? 'photos' : 'a photo'}</span>
          </p>
          <p className="text-muted-foreground text-xs mb-4">A clear, front-facing face works best</p>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              <Upload className="w-4 h-4" /> Choose from device
            </button>
            {/* On phones this opens the camera directly */}
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 border border-border hover:bg-secondary text-foreground px-4 py-2.5 rounded-lg text-sm font-medium sm:hidden"
            >
              <Camera className="w-4 h-4" /> Take a photo
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ''; // allow picking the same file again
          }}
          className="hidden"
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {notice && <p className="text-xs text-yellow-600 mt-2">{notice}</p>}

      {previews.length > 0 && (
        <div className={`mt-4 grid gap-3 ${multiple ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 max-w-xs'}`}>
          {previews.map((preview, index) => (
            <div key={preview} className="relative group">
              <img
                src={preview}
                alt={`Selected photo ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-border"
              />
              {/* type="button" so it doesn't submit the form; always visible on touch screens */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
