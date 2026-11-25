// Single place for talking to the backend; attaches the login token to every request.
//
// By default requests go to this same website (/api/...), which forwards them
// to the backend (see next.config.mjs). That way the site also works when it is
// opened from a phone on the same Wi-Fi. A localhost value in
// NEXT_PUBLIC_API_URL is ignored, because "localhost" on a phone is the phone.
const configured = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
export const API_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(configured) ? '' : configured;

const TOKEN_KEY = 'safesight_token';
const USER_KEY = 'safesight_user';

export const tokenStore = {
  get: () => (typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('token'); // key used by the old version
  },
  userKey: USER_KEY,
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('safesight:unauthorized'));
    }
    throw new ApiError(data.message || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

/**
 * Shrinks a photo in the browser before uploading (max 1600 px, JPEG).
 * Phone photos are often 5–10 MB, which is slow on mobile data and caused
 * upload timeouts; 1600 px is plenty for face recognition.
 */
async function shrinkImage(file: File, maxSide = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.88));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file; // format the browser can't decode (e.g. HEIC on desktop): send as-is
  }
}

export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  const small = await shrinkImage(file);
  body.append('image', small, small === file ? file.name : 'photo.jpg');
  const data = await api<{ url: string }>('/api/upload', { method: 'POST', body });
  return data.url;
}

export function timeAgo(date: string | Date): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const units: [number, string][] = [
    [60 * 60 * 24 * 365, 'year'],
    [60 * 60 * 24 * 30, 'month'],
    [60 * 60 * 24, 'day'],
    [60 * 60, 'hour'],
    [60, 'minute'],
  ];
  for (const [secs, name] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
