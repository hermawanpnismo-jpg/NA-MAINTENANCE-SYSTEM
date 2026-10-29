import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts'
];

const provider = new GoogleAuthProvider();
// Add required Drive scopes
SCOPES.forEach((scope) => provider.addScope(scope));

// In-memory token caching (NOT in localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not in memory; trigger fresh sign-in if needed
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth succeeded but no access token was returned.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Google Sign-in error:', err);
    let message = err?.message || 'Authentication failed';
    if (err?.code === 'auth/popup-blocked') {
      message = 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
    } else if (err?.code === 'auth/popup-closed-by-user') {
      message = 'Sign-in was cancelled before completion.';
    } else if (err?.code === 'auth/unauthorized-domain') {
      message = 'This preview domain is not yet in the Firebase authorized domains list. Add this domain in Firebase Console -> Authentication -> Settings -> Authorized domains.';
    } else if (err?.code === 'auth/cancelled-popup-request') {
      message = 'Another sign-in window is already active.';
    }
    throw new Error(message);
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const googleLogout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// ==========================================
// GOOGLE DRIVE API V3 WRAPPERS
// ==========================================

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  owners?: { displayName: string; emailAddress: string; photoLink?: string }[];
  shared?: boolean;
}

export async function listDriveFiles(options?: {
  searchQuery?: string;
  folderId?: string;
  mimeTypeFilter?: string;
  pageSize?: number;
}): Promise<GoogleDriveFile[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive. Please sign in.');

  let q = "trashed = false";
  if (options?.folderId) {
    q += ` and '${options.folderId}' in parents`;
  }
  if (options?.searchQuery) {
    const safeQuery = options.searchQuery.replace(/'/g, "\\'");
    q += ` and (name contains '${safeQuery}' or fullText contains '${safeQuery}')`;
  }
  if (options?.mimeTypeFilter && options.mimeTypeFilter !== 'all') {
    if (options.mimeTypeFilter === 'folder') {
      q += " and mimeType = 'application/vnd.google-apps.folder'";
    } else if (options.mimeTypeFilter === 'document') {
      q += " and (mimeType contains 'document' or mimeType contains 'pdf' or mimeType contains 'text')";
    } else if (options.mimeTypeFilter === 'spreadsheet') {
      q += " and (mimeType contains 'spreadsheet' or mimeType contains 'sheet' or mimeType contains 'csv')";
    } else if (options.mimeTypeFilter === 'image') {
      q += " and mimeType contains 'image/'";
    }
  }

  const params = new URLSearchParams({
    q,
    pageSize: String(options?.pageSize || 40),
    fields: 'files(id, name, mimeType, size, modifiedTime, iconLink, webViewLink, webContentLink, owners, shared)',
    orderBy: 'folder,modifiedTime desc'
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Google Drive API error: ${res.status}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function uploadFileToDrive(
  file: File,
  folderId?: string
): Promise<GoogleDriveFile> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const metadata: any = {
    name: file.name,
    mimeType: file.type || 'application/octet-stream'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', file);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || 'Failed to upload file to Google Drive');
  }

  return res.json();
}

export async function saveTextOrCsvToDrive(
  fileName: string,
  content: string,
  mimeType = 'text/csv'
): Promise<GoogleDriveFile> {
  const blob = new Blob([content], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  return uploadFileToDrive(file);
}

export async function createDriveFolder(
  folderName: string,
  parentFolderId?: string
): Promise<GoogleDriveFile> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to create folder in Google Drive');
  }

  return res.json();
}

export async function deleteDriveFile(fileId: string, fileName: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated with Google Drive');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to delete file from Google Drive');
  }
}
