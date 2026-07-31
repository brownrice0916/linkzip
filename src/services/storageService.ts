import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, storage } from '../lib/firebase';

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const optimizeImage = async (file: File, maxDimension: number, alwaysInspect = false): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml' || (!alwaysInspect && file.size < 320_000)) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 320_000) {
    bitmap.close();
    return file;
  }
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
  const isProfileAsset = /(?:avatar|logo)/i.test(pathPrefix);
  const maxDimension = isProfileAsset ? 640 : 1440;
  // 프로필 이미지는 원본 파일 용량이 작아도 해상도가 지나치게 클 수 있으므로
  // 픽셀 크기를 항상 검사한다. PNG 투명도는 WebP 변환 후에도 유지된다.
  const uploadFile = await optimizeImage(file, maxDimension, isProfileAsset);
  const path = `${pathPrefix}/${Date.now()}_${safeFileName(uploadFile.name)}`;
  const snapshot = await uploadBytes(ref(storage, path), uploadFile, {
    contentType: uploadFile.type,
    cacheControl: 'public,max-age=31536000,immutable',
  });
  return getDownloadURL(snapshot.ref);
}

export interface PublicFileUploadResult {
  url: string;
  path: string;
}

export const MAX_SHARED_FILE_BYTES = 5 * 1024 * 1024;

interface SharedFileUploadReservation {
  filePath: string;
  reservationId: string | null;
  dailyLimitBytes: number | null;
}

const createShareToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
};

export async function uploadPublicFile(
  uid: string,
  file: File,
  maxBytes = MAX_SHARED_FILE_BYTES,
  requiresBetaReservation = false,
): Promise<PublicFileUploadResult> {
  if (file.size > maxBytes) {
    throw new Error(`공유 파일은 ${Math.round(maxBytes / 1024 / 1024)}MB 이하만 업로드할 수 있습니다.`);
  }
  const shareToken = createShareToken();
  let path = `shared-files/${uid}/${Date.now()}_${safeFileName(file.name)}`;
  let reservationId: string | null = null;
  if (requiresBetaReservation) {
    const reserveUpload = httpsCallable<
      {fileName: string; size: number},
      SharedFileUploadReservation
    >(getFunctions(app, 'asia-northeast3'), 'reserveSharedFileUpload');
    const reservation = await reserveUpload({fileName: file.name, size: file.size});
    path = reservation.data.filePath;
    reservationId = reservation.data.reservationId;
  }
  await uploadBytes(ref(storage, path), file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: 'public,max-age=3600',
    contentDisposition: `attachment; filename="${safeFileName(file.name)}"`,
    customMetadata: {
      linkzipShareToken: shareToken,
      ...(reservationId ? {linkzipUploadReservation: reservationId} : {}),
    },
  });
  const params = new URLSearchParams({ path, token: shareToken, name: file.name });
  return {
    url: `/api/files/download?${params.toString()}`,
    path,
  };
}

export async function deletePublicFile(path: string | undefined, uid: string): Promise<void> {
  if (!path || !path.startsWith(`shared-files/${uid}/`)) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    console.warn('Unable to remove shared file', error);
  }
}

const parseFirebaseStorageUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== 'firebasestorage.googleapis.com') return null;
    const objectPath = parsedUrl.pathname.match(/\/o\/(.+)$/)?.[1];
    const token = parsedUrl.searchParams.get('token');
    if (!objectPath || !token) return null;
    return { path: decodeURIComponent(objectPath), token };
  } catch {
    return null;
  }
};

export function getPublicFileDownloadUrl(
  filePath: string | undefined,
  firebaseUrl: string | undefined,
  fileName: string | undefined,
): string {
  const parsed = firebaseUrl ? parseFirebaseStorageUrl(firebaseUrl) : null;
  const path = filePath || parsed?.path;
  const token = parsed?.token;
  if (!path?.startsWith('shared-files/') || !token) return firebaseUrl || '';

  const params = new URLSearchParams({ path, token });
  if (fileName) params.set('name', fileName);
  return `/api/files/download?${params.toString()}`;
}

export async function uploadPrivateDigitalProductFile(uid: string, file: File): Promise<string> {
  if (file.size > 100 * 1024 * 1024) {
    throw new Error('디지털 파일은 100MB 이하만 업로드할 수 있습니다.');
  }
  const path = `digital-products/${uid}/${Date.now()}_${safeFileName(file.name)}`;
  await uploadBytes(ref(storage, path), file, {
    contentType: file.type || 'application/octet-stream',
    cacheControl: 'private,no-store',
    contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  });
  return path;
}

export async function deleteOwnedProfileImage(url: string | undefined, uid: string, stillUsedUrls: Set<string>): Promise<void> {
  if (!url || stillUsedUrls.has(url) || !url.includes('firebasestorage.googleapis.com') || !url.includes(encodeURIComponent(`profiles/${uid}/`))) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    console.warn('Unable to remove replaced profile image', error);
  }
}
