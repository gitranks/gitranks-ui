'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

import { ApplyCard } from './apply-parts';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { UNSUNG_HERO_APPLY_PATH } from '@/lib/unsung-hero/unsung-hero';

/** Signed out: the GitHub sign-in, back to this page. */
export function ApplySignIn() {
  const [pending, setPending] = useState(false);
  return (
    <ApplyCard>
      <h2 className="text-lg font-semibold">Sign in to apply</h2>
      <p className="text-sm text-muted-foreground">
        Sign in with GitHub to see the packages from repositories you own, or to nominate another one. We only read
        public data.
      </p>
      <div>
        <Button
          type="button"
          disabled={pending}
          className="max-sm:min-h-11"
          onClick={() => {
            setPending(true);
            signIn(IDENTITY_PROVIDER, { redirectTo: UNSUNG_HERO_APPLY_PATH }).catch(() => setPending(false));
          }}
        >
          <FaGithub aria-hidden="true" />
          Sign in with GitHub
        </Button>
      </div>
    </ApplyCard>
  );
}
