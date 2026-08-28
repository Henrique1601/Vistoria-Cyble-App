import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * OAuth2 callback for OneDrive.
 * Receives the auth code from Microsoft and returns tokens to the client.
 * The client stores tokens in localStorage.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    // Redirect back to app with error
    const appUrl = new URL('/', req.url);
    appUrl.searchParams.set('onedrive_error', error);
    return NextResponse.redirect(appUrl);
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?onedrive_error=no_code', req.url));
  }

  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;

  if (!clientId) {
    return NextResponse.redirect(new URL('/?onedrive_error=no_client_id', req.url));
  }

  try {
    const redirectUri = `${new URL(req.url).origin}/api/onedrive-callback`;

    // Exchange auth code for tokens
    const tokenResp = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: 'Files.ReadWrite offline_access',
      }),
    });

    if (!tokenResp.ok) {
      const err = await tokenResp.text();
      console.error('Token exchange failed:', err);
      return NextResponse.redirect(new URL('/?onedrive_error=token_exchange_failed', req.url));
    }

    const tokens = await tokenResp.json();

    // Redirect back to app with tokens in URL fragment (hash)
    // Using hash instead of query params so tokens don't appear in server logs
    const appUrl = new URL('/', req.url);
    appUrl.hash = `onedrive_token=${encodeURIComponent(JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    }))}`;

    return NextResponse.redirect(appUrl);
  } catch (err) {
    console.error('OneDrive callback error:', err);
    return NextResponse.redirect(new URL('/?onedrive_error=callback_failed', req.url));
  }
}
