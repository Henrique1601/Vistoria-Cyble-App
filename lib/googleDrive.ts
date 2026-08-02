const GAPI_KEY = 'AIzaSyD-9t2KEq2q_9YKn3kMmP3hE8lC3l6g7ZI';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let gapiInited = false;
let tokenClient: any = null;

export async function initGoogleDrive(): Promise<boolean> {
  if (gapiInited) return true;

  try {
    await loadScript('https://apis.google.com/js/api.js');
    await loadScript('https://accounts.google.com/gsi/client');

    await new Promise<void>((resolve) => (window as any).gapi.load('client:picker', resolve));
    await (window as any).gapi.client.init({ apiKey: GAPI_KEY, discoveryDocs: [DISCOVERY_DOC] });

    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: '825105422982-7f3o43sd86jiiujbj4pc5drlib59pj46.apps.googleusercontent.com',
      scope: SCOPES,
      callback: () => {},
    });

    gapiInited = true;
    return true;
  } catch {
    return false;
  }
}

export function requestGoogleDriveAccess(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!tokenClient) { resolve(false); return; }
    tokenClient.callback = (resp: any) => { resolve(!!resp.access_token); };
    tokenClient.error_callback = () => resolve(false);
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function backupToGoogleDrive(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const metadata = { name: fileName, mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${(window as any).gapi.auth.getToken().access_token}` },
      body: form,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listGoogleDriveBackups(): Promise<{ id: string; name: string; createdTime: string }[]> {
  try {
    const res = await (window as any).gapi.client.drive.files.list({
      q: "name contains 'vistoria' and mimeType = 'application/json' and trashed = false",
      fields: 'files(id,name,createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 20,
    });
    return res.result.files || [];
  } catch {
    return [];
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
