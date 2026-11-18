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
    /** The session's email in lower case, when GitHub marked it verified at the sign-in; absent otherwise. */
    verifiedEmail?: string;
    /** The light sign-in's GitHub token, kept for the maintainers page alone and never put in the session it shows. */
    maintainerToken?: string;
    /** When `maintainerToken` stops being used, in milliseconds. */
    maintainerTokenExpiresAt?: number;
  }
}
