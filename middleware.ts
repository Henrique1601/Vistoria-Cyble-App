import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*|manifest.json|sw.js).*)'],
};

export function middleware(req: NextRequest) {
  // HTTPS enforcement in production
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.get('x-forwarded-proto') !== 'https' &&
    !req.nextUrl.hostname.includes('localhost')
  ) {
    const httpsUrl = req.nextUrl.clone();
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl, 301);
  }

  // Security headers (additional to next.config.mjs)
  const response = NextResponse.next();
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('Permissions-Policy', 'camera=self, microphone=(), geolocation=self');

  return response;
}
