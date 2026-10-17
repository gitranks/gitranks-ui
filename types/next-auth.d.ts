import { DefaultSession } from 'next-auth';

import type { AuthMode } from '@/lib/auth-providers';

declare module 'next-auth' {
  interface User {
    githubLogin?: string;
  }

  interface Session extends DefaultSession {
    error?: string;
    user: {
      githubLogin?: string;
      authMode?: AuthMode;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    error?: string;
    access_token?: string;
    expires_at?: number;
    refresh_token?: string;
    githubLogin?: string;
    authMode?: AuthMode;
  }
}
