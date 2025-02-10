import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    githubId?: string;
  }

  interface Session extends DefaultSession {
    user: {
      githubId?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    githubId?: string;
  }
}
