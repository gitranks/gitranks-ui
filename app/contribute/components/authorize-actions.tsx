'use client';

import { signIn } from 'next-auth/react';
import { useState, useTransition } from 'react';
import { FaGithub } from 'react-icons/fa';

import { approveContributeOAuth } from '../actions';
import { approveContributeOAuthAsReviewer } from '../review-sign-in.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import {
  authorizeCancelHrefOf,
  authorizeHrefOf,
  isSafeRedirect,
  REVIEW_PASSWORD_MAX,
  REVIEW_USERNAME_MAX,
} from '@/lib/contribute/oauth-consent';

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

/**
 * The directory reviewers' sign-in (octoscope's OpenAI directory spec §4): the review account's username and password
 * allow this request as that account, with no session here; then the browser goes back to the app, as Allow's does.
 */
export function AuthorizeReviewSignIn({ requestId }: { requestId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);

  const submit = (form: FormData) =>
    startTransition(async () => {
      setError(null);
      const result = await approveContributeOAuthAsReviewer(
        requestId,
        String(form.get('username') ?? ''),
        String(form.get('password') ?? ''),
      );
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
    <form action={submit} className="flex flex-col gap-4" data-authorize="review-form">
      <div className="flex flex-col gap-2">
        <Label htmlFor="review-username">Username</Label>
        <Input
          id="review-username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={REVIEW_USERNAME_MAX}
          className="min-h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="review-password">Password</Label>
        <Input
          id="review-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={REVIEW_PASSWORD_MAX}
          className="min-h-11"
        />
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={pending || left} className={ACTION} data-authorize="review-allow">
          {pending ? 'Signing in…' : 'Sign in and allow'}
        </Button>
        {left ? null : <AuthorizeCancel requestId={requestId} />}
      </div>
      {left ? (
        <p role="status" className="text-sm font-medium">
          Allowed. Go back to the app: it is connected.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
