import { NextResponse } from 'next/server';

export function middleware(request) {
  // Dev: jangan pernah redirect (auto-login developer). Di produksi blok ini mati
  // (process.env.NODE_ENV di-inline saat build), jadi guard di bawah tetap berlaku.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  const isPublicRoute = pathname === '/login';

  // If unauthenticated user attempts to visit protected route -> redirect to /login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
