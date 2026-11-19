'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';

const COPY = {
  contribution: { eyebrow: 'GitRanks Contribute', title: 'Sign in to see this contribution' },
  // A workspace page under `/my`: what an email or an agent links. Nothing of the address's content is named.
  workspace: { eyebrow: 'GitRanks', title: 'Sign in to GitRanks to open this page' },
};

/**
 * A workspace page for a visitor without a session: a pull request's or a lesson's page, the
 * link an agent hands its person, and every page under `/my`, which emails and agents link; often opened in another
 * browser. The GitHub sign-in, back to this very address with its query and hash; then the page shows the user's own,
 * and a 404 to anyone it is not open to.
 */
export function WorkspaceSignIn({ what = 'workspace' }: { what?: keyof typeof COPY }) {
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
              const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
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
