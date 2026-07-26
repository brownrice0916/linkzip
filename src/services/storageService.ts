import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../lib/firebase';

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function uploadPublicImage(pathPrefix: string, file: File): Promise<string> {
  const path = `${pathPrefix}/${Date.now()}_${safeFileName(file.name)}`;
  const snapshot = await uploadBytes(ref(storage, path), file);
  return getDownloadURL(snapshot.ref);
}
