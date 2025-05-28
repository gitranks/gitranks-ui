import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    githubLogin?: string;
  }

  interface Session extends DefaultSession {
    error?: string;
    user: {
      githubLogin?: string;
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
  }
}
