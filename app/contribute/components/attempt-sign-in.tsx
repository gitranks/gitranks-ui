'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';

const COPY = {
  contribution: { eyebrow: 'GitRanks Contribute', title: 'Sign in to see this contribution' },
  lesson: { eyebrow: 'GitRanks Learn', title: 'Sign in to see this lesson' },
  // A lesson's page while Learn is not open to everyone: the page names nothing of it to a visitor.
  page: { eyebrow: 'GitRanks', title: 'Sign in to see this page' },
};

/**
 * A contribution's or a lesson's page for a visitor without a session (`isAttemptPagePath`): the link an agent hands
 * its person, often opened in another browser. The GitHub sign-in, back to this very address; then the page shows the
 * attempt to its owner, and a 404 to anyone else.
 */
export function AttemptSignIn({ what }: { what: keyof typeof COPY }) {
  const [pending, setPending] = useState(false);
  const { eyebrow, title } = COPY[what];
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col pt-4" data-attempt-sign-in={what}>
      <Card className="w-full gap-5 rounded-2xl">
        <CardHeader className="gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>
          <CardTitle>
            <h1 className="text-2xl leading-tight font-bold text-balance">{title}</h1>
          </CardTitle>
          <CardDescription className="text-base leading-normal text-foreground/80">
            Sign in with the GitHub account it belongs to; you come straight back here. GitHub shares your public
            profile and email with us, read-only.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            type="button"
            disabled={pending}
            className="min-h-11 gap-2.5 bg-foreground px-5 font-semibold text-background hover:bg-foreground/85"
            data-sign-in="attempt"
            onClick={() => {
              setPending(true);
              const here = `${window.location.pathname}${window.location.search}`;
              signIn(IDENTITY_PROVIDER, { redirectTo: here }).catch(() => setPending(false));
            }}
          >
            <FaGithub aria-hidden="true" className="size-5" />
            Sign in with GitHub
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
