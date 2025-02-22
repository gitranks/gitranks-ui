import GitHub from 'next-auth/providers/github';
import type { NextAuthConfig } from 'next-auth';

// https://authjs.dev/guides/edge-compatibility#middleware
export default {
  providers: [GitHub],
  debug: true,
} satisfies NextAuthConfig;
