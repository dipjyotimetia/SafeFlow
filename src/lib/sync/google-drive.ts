// Google Drive API service using appDataFolder
// This folder is hidden from the user and only accessible by this app

/* eslint-disable @typescript-eslint/no-explicit-any */

const GOOGLE_API_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const APP_DATA_FOLDER = 'appDataFolder';
const DATA_FILE_NAME = 'safeflow-data.json';

export interface GoogleAuthState {
  isSignedIn: boolean;
  userEmail?: string;
  accessToken?: string;
  expiresAt?: Date;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

// Type for Google Identity Services (loaded dynamically)
declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: any) => any;
      revoke: (token: string, callback: () => void) => void;
    };
  };
};

let tokenClient: any = null;
let accessToken: string | null = null;
let tokenExpiresAt: Date | null = null;

/**
 * Initialize Google Identity Services
 */
export async function initGoogleAuth(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Load the GIS library
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: GOOGLE_API_SCOPE,
          callback: () => {}, // Will be set on requestAccessToken
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Request access token from Google
 */
export async function requestAccessToken(): Promise<GoogleAuthState> {
  if (!tokenClient) {
    throw new Error('Google Auth not initialized. Call initGoogleAuth first.');
  }

  return new Promise((resolve, reject) => {
    tokenClient!.callback = async (response: { error?: string; error_description?: string; access_token: string; expires_in: number }) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error));
        return;
      }

      accessToken = response.access_token;
      tokenExpiresAt = new Date(Date.now() + response.expires_in * 1000);

      // Get user info
      const userInfo = await getUserInfo();

      resolve({
        isSignedIn: true,
        userEmail: userInfo.email,
        accessToken: accessToken,
        expiresAt: tokenExpiresAt,
      });
    };

    // Request the token
    if (accessToken && tokenExpiresAt && tokenExpiresAt > new Date()) {
      // Token still valid
      getUserInfo().then((userInfo) => {
        resolve({
          isSignedIn: true,
          userEmail: userInfo.email,
          accessToken: accessToken!,
          expiresAt: tokenExpiresAt!,
        });
      });
    } else {
      // Need new token
      tokenClient!.requestAccessToken({ prompt: 'consent' });
    }
  });
}

/**
 * Sign out and revoke token
 */
export async function signOut(): Promise<void> {
  if (accessToken) {
    google.accounts.oauth2.revoke(accessToken, () => {});
    accessToken = null;
    tokenExpiresAt = null;
  }
}

/**
 * Get current auth state
 */
export function getAuthState(): GoogleAuthState {
  const isSignedIn = !!accessToken && !!tokenExpiresAt && tokenExpiresAt > new Date();
  return {
    isSignedIn,
    accessToken: isSignedIn ? accessToken! : undefined,
    expiresAt: isSignedIn ? tokenExpiresAt! : undefined,
  };
}

/**
 * Get user info from Google
 */
async function getUserInfo(): Promise<{ email: string; name?: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get user info');
  }

  return response.json();
}

/**
 * Make authenticated request to Google Drive API
 */
async function driveRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Drive API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Find the data file in appDataFolder
 */
export async function findDataFile(): Promise<DriveFile | null> {
  const result = await driveRequest<{ files: DriveFile[] }>(
    `/files?spaces=${APP_DATA_FOLDER}&q=name='${DATA_FILE_NAME}'&fields=files(id,name,modifiedTime,size)`
  );

  return result.files?.[0] || null;
}

/**
 * Upload data to Google Drive appDataFolder
 */
export async function uploadData(data: string): Promise<DriveFile> {
  const existingFile = await findDataFile();

  const metadata = {
    name: DATA_FILE_NAME,
    mimeType: 'application/json',
    ...(existingFile ? {} : { parents: [APP_DATA_FOLDER] }),
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', new Blob([data], { type: 'application/json' }));

  const endpoint = existingFile
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

  const method = existingFile ? 'PATCH' : 'POST';

  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || 'Failed to upload data');
  }

  return response.json();
}

/**
 * Download data from Google Drive appDataFolder
 */
export async function downloadData(): Promise<string | null> {
  const file = await findDataFile();

  if (!file) {
    return null;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to download data');
  }

  return response.text();
}

/**
 * Get last modified time of the data file
 */
export async function getLastModified(): Promise<Date | null> {
  const file = await findDataFile();
  return file ? new Date(file.modifiedTime) : null;
}

/**
 * Delete the data file from appDataFolder
 */
export async function deleteDataFile(): Promise<void> {
  const file = await findDataFile();

  if (file) {
    await driveRequest(`/files/${file.id}`, { method: 'DELETE' });
  }
}
