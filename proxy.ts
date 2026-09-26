import NextAuth from 'next-auth';

import authConfig from './auth.config';

const { auth: proxy } = NextAuth(authConfig);

export default proxy;

/**
 * Auth.js sets its CSRF and callback-url cookies on every response it touches, and a shared
 * cache will not store a response that sets a cookie. Keep it off anonymous, cacheable
 * routes — avatars, badges, sitemaps, robots.txt — and off static assets; pages and the
 * session-aware API routes still go through it.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/avatar|api/badge|badges|sitemap\\.xml|sitemaps|robots\\.txt|favicon\\.ico|apple-icon\\.png|icons|fonts|logo-).*)',
  ],
};
