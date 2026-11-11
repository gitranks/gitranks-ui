'use client';

import { signIn } from 'next-auth/react';
import { useState, useTransition } from 'react';
import { FaGithub } from 'react-icons/fa';

import { approveContributeOAuth } from '../actions';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { authorizeCancelHrefOf, authorizeHrefOf, isSafeRedirect } from '@/lib/contribute/oauth-consent';

const ACTION = 'min-h-11 px-5 font-semibold';

/** Cancel: a plain link through the MCP server, which tells the agent the user said no. Works signed out too. */
export function AuthorizeCancel({ requestId, label = 'Cancel' }: { requestId: string; label?: string }) {
  return (
    <Button asChild variant="outline" className={ACTION}>
      <a href={authorizeCancelHrefOf(requestId)} data-authorize="cancel">
        {label}
      </a>
    </Button>
  );
}

/**
 * Allow and Cancel. Allow connects the agent, then the browser goes back to it, only to an address that passes the
 * check (`https:`, `http:` to this computer, or an app's own scheme): a server action's own redirect can't open an
 * app's scheme, so the page assigns it.
 */
export function AuthorizeActions({ requestId, clientName }: { requestId: string; clientName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);

  const allow = () =>
    startTransition(async () => {
      setError(null);
      const result = await approveContributeOAuth(requestId);
      if (!result.ok) {
        setError(result.message ?? contributeErrorMessage(result.error));
        return;
      }
      if (!isSafeRedirect(result.data.redirectTo)) {
        setError("We can't send you back to this app: its address isn't one we allow.");
        return;
      }
      setLeft(true);
      window.location.assign(result.data.redirectTo);
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        <Button type="button" onClick={allow} disabled={pending || left} className={ACTION} data-authorize="allow">
          {pending ? 'Allowing…' : 'Allow'}
        </Button>
        {left ? null : <AuthorizeCancel requestId={requestId} />}
      </div>
      {left ? (
        <p role="status" className="text-sm font-medium">
          Allowed. Go back to {clientName}: it is connected.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Signed out: the identity sign-in (read-only profile and email), back to this page. */
export function AuthorizeSignIn({ requestId }: { requestId: string }) {
  const [pending, setPending] = useState(false);
  return (
    <div className="flex flex-wrap gap-2.5">
      <Button
        type="button"
        disabled={pending}
        className="min-h-11 gap-2.5 bg-foreground px-5 font-semibold text-background hover:bg-foreground/85"
        data-authorize="sign-in"
        onClick={() => {
          setPending(true);
          signIn(IDENTITY_PROVIDER, { redirectTo: authorizeHrefOf(requestId) }).catch(() => setPending(false));
        }}
      >
        <FaGithub aria-hidden="true" className="size-5" />
        Sign in with GitHub
      </Button>
      <AuthorizeCancel requestId={requestId} />
    </div>
  );
}
