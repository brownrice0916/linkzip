import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const optimizeImage = async (file: File, maxDimension: number): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml' || file.size < 320_000) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.84));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp', lastModified: Date.now() });
};

export async function uploadPublicImage(pathPrefix: string, file: File): Promise<string> {
  const maxDimension = /(?:avatar|logo)/i.test(pathPrefix) ? 640 : 1440;
  const uploadFile = await optimizeImage(file, maxDimension);
  const path = `${pathPrefix}/${Date.now()}_${safeFileName(uploadFile.name)}`;
  const snapshot = await uploadBytes(ref(storage, path), uploadFile, {
    contentType: uploadFile.type,
    cacheControl: 'public,max-age=31536000,immutable',
  });
  return getDownloadURL(snapshot.ref);
}

export async function uploadPublicFile(uid: string, file: File): Promise<string> {
  const path = `shared-files/${uid}/${Date.now()}_${safeFileName(file.name)}`;
  const snapshot = await uploadBytes(ref(storage, path), file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: 'public,max-age=3600',
    contentDisposition: `attachment; filename="${safeFileName(file.name)}"`,
  });
  return getDownloadURL(snapshot.ref);
}

export async function deleteOwnedProfileImage(url: string | undefined, uid: string, stillUsedUrls: Set<string>): Promise<void> {
  if (!url || stillUsedUrls.has(url) || !url.includes('firebasestorage.googleapis.com') || !url.includes(encodeURIComponent(`profiles/${uid}/`))) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    console.warn('Unable to remove replaced profile image', error);
  }
}
