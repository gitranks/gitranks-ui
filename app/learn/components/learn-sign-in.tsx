'use client';

import { signIn } from 'next-auth/react';
import { type ReactNode, useState } from 'react';

import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { LEARN_PROFILE_PATH } from '@/lib/learn/learn-path';

/** A visitor's "Start learning": the GitHub sign-in, back to Goal and level (or `redirectTo`, a path of ours). */
export function LearnSignInButton({
  className,
  children,
  redirectTo = LEARN_PROFILE_PATH,
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
        signIn(IDENTITY_PROVIDER, { redirectTo }).catch(() => setPending(false));
      }}
    >
      {children}
    </button>
  );
}
