/**
 * OneDrive integration via Microsoft Graph API.
 * Handles OAuth2 flow, token management, and file uploads.
 */

const ONEDRIVE_CLIENT_ID = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || '';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const SCOPES = 'Files.ReadWrite offline_access';
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/api/onedrive-callback` : '';

// --- Token types ---
interface TokenCache {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

const TOKEN_KEY = 'vistoria_onedrive_tokens';

// --- Token management ---
export function getStoredTokens(): TokenCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeTokens(tokens: TokenCache) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function isConnected(): boolean {
  const tokens = getStoredTokens();
  if (!tokens) return false;
  // Check if token is still valid (with 5min buffer)
  return tokens.expires_at > Date.now() + 5 * 60 * 1000;
}

// --- OAuth2 Flow ---
export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: ONEDRIVE_CLIENT_ID,
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
}

export function startAuthFlow() {
  if (typeof window === 'undefined') return;
  window.location.href = getAuthUrl();
}

// --- Token refresh ---
async function refreshAccessToken(refreshToken: string): Promise<TokenCache> {
  const resp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: ONEDRIVE_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: SCOPES,
    }),
  });

  if (!resp.ok) {
    clearTokens();
    throw new Error('Token refresh failed');
  }

  const data = await resp.json();
  const tokens: TokenCache = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  storeTokens(tokens);
  return tokens;
}

// --- Get valid access token ---
async function getValidToken(): Promise<string> {
  let tokens = getStoredTokens();
  if (!tokens) {
    throw new Error('OneDrive não conectado. Conecte em Configurações.');
  }

  // If token expires in less than 5 minutes, refresh
  if (tokens.expires_at < Date.now() + 5 * 60 * 1000) {
    tokens = await refreshAccessToken(tokens.refresh_token);
  }

  return tokens.access_token;
}

// --- Upload file to OneDrive ---
// Uses PUT /me/drive/root:/{path}:/content for files < 4MB
// For larger files, uses upload session (chunked)
export async function uploadToOneDrive(
  filePath: string,
  fileBlob: Blob,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; id: string }> {
  const token = await getValidToken();

  // Ensure parent folders exist
  const pathParts = filePath.split('/');
  const fileName = pathParts.pop()!;
  const folderPath = pathParts.join('/');

  if (folderPath) {
    await ensureFolderExists(folderPath, token);
  }

  const fullUrl = `${GRAPH_BASE}/me/drive/root:/${encodeURIComponent(filePath)}:/content`;

  // For files < 4MB, use simple PUT
  if (fileBlob.size < 4 * 1024 * 1024) {
    const resp = await fetch(fullUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': fileBlob.type || 'application/octet-stream',
      },
      body: fileBlob,
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`OneDrive upload failed: ${resp.status} ${err}`);
    }

    const data = await resp.json();
    onProgress?.(100);
    return { url: data.webUrl || '', id: data.id };
  }

  // For files >= 4MB, use upload session
  return uploadLargeFile(fullUrl, fileBlob, token, onProgress);
}

// --- Upload large file via session ---
async function uploadLargeFile(
  url: string,
  blob: Blob,
  token: string,
  onProgress?: (pct: number) => void,
): Promise<{ url: string; id: string }> {
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
  const totalSize = blob.size;

  // Create upload session
  const sessionResp = await fetch(
    `${GRAPH_BASE}/me/drive/root:/${encodeURIComponent(url.split('/root:/')[1]?.split(':/content')[0] || '')}:/createUploadSession`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        item: {
          '@microsoft.graph.conflictBehavior': 'replace',
        },
      }),
    }
  );

  if (!sessionResp.ok) {
    throw new Error(`Failed to create upload session: ${sessionResp.status}`);
  }

  const session = await sessionResp.json();
  const uploadUrl = session.uploadUrl;

  // Upload chunks
  let offset = 0;
  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = blob.slice(offset, end);

    const chunkResp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`,
        'Content-Length': String(end - offset),
      },
      body: chunk,
    });

    if (!chunkResp.ok && chunkResp.status !== 202) {
      throw new Error(`Chunk upload failed: ${chunkResp.status}`);
    }

    offset = end;
    onProgress?.(Math.round((offset / totalSize) * 100));
  }

  // Final response
  const finalResp = await fetch(uploadUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!finalResp.ok) {
    throw new Error('Failed to get final upload result');
  }

  const finalData = await finalResp.json();
  return { url: finalData.webUrl || '', id: finalData.id };
}

// --- Ensure folder exists (create if not) ---
async function ensureFolderExists(folderPath: string, token: string) {
  // Try to get the folder — if 404, create it
  const checkUrl = `${GRAPH_BASE}/me/drive/root:/${encodeURIComponent(folderPath)}`;
  const checkResp = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (checkResp.status === 404) {
    // Create folder chain
    const parts = folderPath.split('/');
    let currentPath = '';
    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const createUrl = `${GRAPH_BASE}/me/drive/root:/${encodeURIComponent(currentPath)}`;
      const createResp = await fetch(createUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // If still 404, try to create parent first
      if (createResp.status === 404 && currentPath !== part) {
        // Create via children endpoint
        const parentPath = currentPath.split('/').slice(0, -1).join('/');
        const parentUrl = parentPath
          ? `${GRAPH_BASE}/me/drive/root:/${encodeURIComponent(parentPath)}:/children`
          : `${GRAPH_BASE}/me/drive/root/children`;
        await fetch(parentUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: part,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'ignore',
          }),
        });
      }
    }
  }
}

// --- Get shareable link for a file ---
export async function getShareLink(filePath: string): Promise<string | null> {
  try {
    const token = await getValidToken();
    const url = `${GRAPH_BASE}/me/drive/root:/${encodeURIComponent(filePath)}:/createLink`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'view', scope: 'anonymous' }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    return data.link?.webUrl || null;
  } catch {
    return null;
  }
}

// --- Disconnect ---
export function disconnect() {
  clearTokens();
}
