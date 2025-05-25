import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    githubLogin?: string;
  }

  interface Session extends DefaultSession {
    user: {
      githubLogin?: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    githubLogin?: string;
  }
}
