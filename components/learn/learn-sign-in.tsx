'use client';

import { signIn } from 'next-auth/react';
import { type ReactNode, useState } from 'react';

import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import { learnSetupHrefOf } from '@/lib/workspace/paths';

/**
 * A visitor's "Start learning": the GitHub sign-in, then Learn's onboarding, which leads back to Learn home (or to
 * `redirectTo`, a path of ours). A person who has the Learn sign is sent on from the onboarding at once.
 */
export function LearnSignInButton({
  className,
  children,
  redirectTo = LEARN_PATH,
}: {
  className?: string;
  children: ReactNode;
  redirectTo?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      data-sign-in="learn"
      onClick={() => {
        setPending(true);
        signIn(IDENTITY_PROVIDER, { redirectTo: learnSetupHrefOf(redirectTo) }).catch(() => setPending(false));
      }}
    >
      {children}
    </button>
  );
}
