import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

// https://authjs.dev/guides/edge-compatibility#middleware
export default {
  providers: [GitHub],
} satisfies NextAuthConfig;
