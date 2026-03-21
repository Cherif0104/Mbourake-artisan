/**
 * Upload vers Cloudinary (contournement bug Supabase Storage 500 / récursion RLS 42P17)
 * Utilise un preset "unsigned" pour upload direct depuis le client.
 * Supporte : images, vidéos, audio (raw).
 */

const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string)?.trim();
const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string)?.trim();

export function isCloudinaryConfigured(): boolean {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}

async function uploadToCloudinaryInternal(
  file: File | Blob,
  resourceType: 'image' | 'video' | 'raw',
  folder?: string,
  fileNameHint?: string
): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary non configuré (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET)');
  }

  const blob = file instanceof Blob ? file : new Blob([file]);
  const name = file instanceof File ? file.name : fileNameHint || 'upload';
  const formFile = file instanceof File ? file : new File([blob], name, { type: blob.type });

  const formData = new FormData();
  formData.append('file', formFile);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Upload Cloudinary échoué: ${response.status}`);
  }

  const data = await response.json();
  return data.secure_url;
}

/** Upload d'images (photos) */
export async function uploadToCloudinary(file: File, folder?: string): Promise<string> {
  return uploadToCloudinaryInternal(file, 'image', folder);
}

/** Upload de vidéos (mp4, webm, etc.) */
export async function uploadToCloudinaryVideo(file: File, folder?: string): Promise<string> {
  return uploadToCloudinaryInternal(file, 'video', folder);
}

/** Upload d'audio (webm, mp3, etc.) — Blob ou File */
export async function uploadToCloudinaryAudio(blob: Blob, folder?: string, ext?: string): Promise<string> {
  const name = `audio-${Date.now()}.${ext || 'webm'}`;
  return uploadToCloudinaryInternal(blob, 'raw', folder, name);
}
