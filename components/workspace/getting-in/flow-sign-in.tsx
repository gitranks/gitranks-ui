'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { type ContributeSource, contributeSource } from '@/lib/workspace/click-tracking';

/** The sign-in, back to this very address with its query (a flow's answers ride in it) and hash. */
export function signInBackHere(): Promise<unknown> {
  const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return signIn(IDENTITY_PROVIDER, { redirectTo: here });
}

/**
 * The sign-in card of a flow step that needs an account: why the account is needed from here, what GitHub shares, and
 * Sign in with GitHub, which comes back to the same address, the answers in it kept.
 */
export function FlowSignIn({ title, text, source }: { title: string; text: string; source: ContributeSource }) {
  const [pending, setPending] = useState(false);
  return (
    <section
      data-flow-sign-in=""
      className="flex flex-col gap-4 rounded-xl border-2 border-primary bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">{text}</p>
        <p className="text-xs text-muted-foreground">GitHub shares your public profile and email with us, read-only.</p>
      </div>
      <Button
        type="button"
        size="lg"
        disabled={pending}
        className="min-h-11 shrink-0 gap-2.5 font-semibold max-sm:w-full"
        data-sign-in="flow"
        {...contributeSource(source)}
        onClick={() => {
          setPending(true);
          signInBackHere().catch(() => setPending(false));
        }}
      >
        <FaGithub aria-hidden="true" className="size-5" />
        Sign in with GitHub
      </Button>
    </section>
  );
}
