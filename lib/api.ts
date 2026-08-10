export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const pin = sessionStorage.getItem('vistoria_pin');
  return pin ? { 'x-app-pin': pin } : {};
}

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...init?.headers,
  };
  return fetch(input, { ...init, headers });
}
