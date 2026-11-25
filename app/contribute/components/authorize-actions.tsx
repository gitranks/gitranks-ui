'use client';

import { signIn } from 'next-auth/react';
import { type ReactNode, useState, useTransition } from 'react';
import { FaGithub } from 'react-icons/fa';

import { AUTHORIZE_SETUP_LINE, AuthorizeNextStep, AuthorizeSetupStep } from './authorize-next-step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { approveContributeOAuth } from '@/lib/workspace/actions';
import type { ContributeOAuthClientWhere } from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import {
  authorizeCancelHrefOf,
  authorizeHrefOf,
  isSafeRedirect,
  REVIEW_PASSWORD_MAX,
  REVIEW_USERNAME_MAX,
} from '@/lib/workspace/oauth-consent';
import { approveContributeOAuthAsReviewer } from '@/lib/workspace/review-sign-in.actions';

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

/** Cancel once allowed: kept in its place, off, so the buttons' row does not change. */
function OffCancel() {
  return (
    <Button type="button" variant="outline" disabled className={ACTION} data-authorize="cancel">
      Cancel
    </Button>
  );
}

/**
 * A new tab for the agent's way back, opened in the press itself so the browser counts it as the person's own, with no
 * way back to this page (`opener` null). Null when the browser blocks it.
 */
function openBlankTab(): Window | null {
  try {
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    return tab;
  } catch {
    return null;
  }
}

/** How the page ends after Allow: it is leaving (today's words), or it stays with the setup's step. */
type Left = 'today' | 'setup';

/**
 * Allow and Cancel. Allow connects the agent, then the browser goes back to it, only to an address that passes the
 * check (`https:`, `http:` to this computer, or an app's own scheme): a server action's own redirect can't open an
 * app's scheme, so the page assigns it. An app's scheme leaves this page open, so it says what to ask the agent next.
 * Once allowed, Cancel stays in its place, off, and what to do next shows after the card's own lines (`children`), so
 * nothing above it moves.
 *
 * A person who has gone through neither onboarding (`setup`) is told of the one step left, with "Finish setting up",
 * where the page stays: a terminal agent's way back (`LOOPBACK`) opens in a new tab (as today when the browser blocks
 * it), and an app's scheme leaves the page open anyway. A web app takes the page back at once, as today.
 */
export function AuthorizeActions({
  requestId,
  clientName,
  kind = null,
  setup = false,
  children,
}: {
  requestId: string;
  /** The name the app gave itself; none, and the page says "the app". */
  clientName?: string;
  /** Where the app goes back (`clientWhere.kind`); null when not known. */
  kind?: ContributeOAuthClientWhere['kind'] | null;
  /** The person has gone through neither onboarding. */
  setup?: boolean;
  /** The card's lines under the buttons: they stay where they are when Allow goes through. */
  children?: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<Left | null>(null);

  const allow = () => {
    // Before the approval is awaited, so the browser counts the tab as opened by the press.
    const tab = setup && kind === 'LOOPBACK' ? openBlankTab() : null;
    startTransition(async () => {
      setError(null);
      // A call that throws is said as a failed one, so the new tab never stays open on nothing.
      const result: Awaited<ReturnType<typeof approveContributeOAuth>> = (await approveContributeOAuth(requestId).catch(
        () => null,
      )) ?? { ok: false, error: 'FAILED' };
      if (!result.ok) {
        tab?.close();
        setError(result.message ?? contributeErrorMessage(result.error));
        return;
      }
      if (!isSafeRedirect(result.data.redirectTo)) {
        tab?.close();
        setError("We can't send you back to this app: its address isn't one we allow.");
        return;
      }
      // A tab closed meanwhile can't take the way back: the page goes back itself, as when the tab was blocked.
      if (tab && !tab.closed) {
        tab.location.href = result.data.redirectTo;
        setLeft('setup');
        return;
      }
      setLeft(setup && kind === 'SCHEME' ? 'setup' : 'today');
      window.location.assign(result.data.redirectTo);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        <Button
          type="button"
          onClick={allow}
          disabled={pending || left !== null}
          className={ACTION}
          data-authorize="allow"
        >
          {pending ? 'Allowing…' : 'Allow'}
        </Button>
        {left ? <OffCancel /> : <AuthorizeCancel requestId={requestId} />}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {children}
      {left === 'setup' ? (
        <>
          <p role="status" className="text-sm font-medium">
            {AUTHORIZE_SETUP_LINE}
          </p>
          <AuthorizeSetupStep />
        </>
      ) : left === 'today' ? (
        <>
          <p role="status" className="text-sm font-medium">
            Allowed. Go back to {clientName ?? 'the app'}: it is connected.
          </p>
          <AuthorizeNextStep clientName={clientName} />
        </>
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
export function AuthorizeReviewSignIn({ requestId, children }: { requestId: string; children?: ReactNode }) {
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
        {left ? <OffCancel /> : <AuthorizeCancel requestId={requestId} />}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
      {children}
      {left ? (
        <>
          <p role="status" className="text-sm font-medium">
            Allowed. Go back to the app: it is connected.
          </p>
          <AuthorizeNextStep />
        </>
      ) : null}
    </form>
  );
}
