'use client';

import { signIn, useSession } from 'next-auth/react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';

/** The second hero action: sign in to see your own rank without typing. Hidden once signed in. */
export const HeroSignIn = () => {
  const { status } = useSession();

  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="text-muted-foreground">or</span>
      <Button variant="outline" size="sm" onClick={() => signIn(IDENTITY_PROVIDER)}>
        <FaGithub />
        Sign in with GitHub
      </Button>
      <span className="text-muted-foreground">to see yours without typing</span>
    </div>
  );
};
