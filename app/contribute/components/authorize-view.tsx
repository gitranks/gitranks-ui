import { CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AuthorizeActions, AuthorizeCancel, AuthorizeReviewSignIn, AuthorizeSignIn } from './authorize-actions';
import { AuthorizeDocsLine, AuthorizeNextStep } from './authorize-next-step';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { NO_PROFILE_TITLE, SETTING_UP_TITLE } from '@/components/workspace/setting-up';
import { SettingUpAutoRefresh } from '@/components/workspace/setting-up-refresh';
import { LearnSetupRefresh } from '@/components/workspace/setup-refresh';
import type { ContributeOAuthRequest } from '@/lib/workspace/contribute.types';
import {
  AGENT_CAN,
  AGENT_CANNOT,
  authorizeHrefOf,
  authorizeReviewHrefOf,
  clientWhereTextOf,
  REVIEW_SIGN_IN_SHOWN,
  waitingLineOf,
} from '@/lib/workspace/oauth-consent';
import { MCP_DOCS_PATH, settingsPathOf } from '@/lib/workspace/paths';

/** What the consent page shows: one state per variant of the copy. */
export type AuthorizeState =
  /** No session: the sign-in first, back to this page. */
  | { kind: 'signed-out'; requestId: string }
  /** Signed out, on the directory reviewers' sign-in (`&review=1`): username and password, no session. */
  | { kind: 'review-sign-in'; requestId: string }
  /** Signed in, and the request waits for Allow. */
  | { kind: 'pending'; requestId: string; login: string; request: ContributeOAuthRequest }
  /** The preview, and this account is not on it: Cancel alone. */
  | { kind: 'not-open'; requestId: string }
  /** A new account, read for the first time now: Refresh and Cancel, and the page reads itself again. */
  | { kind: 'setting-up'; requestId: string }
  /** Launched, and GitRanks has no profile of the account, nor is one on its way: Cancel alone. */
  | { kind: 'no-profile'; requestId: string }
  /** Allowed already. */
  | { kind: 'approved'; requestId: string; clientName: string | null }
  /** Unknown, expired or used, or a link without a request. */
  | { kind: 'expired' }
  /** The request could not be read now. */
  | { kind: 'unavailable'; requestId: string };

/** What the API answered for the consent page: the request, and whether the account is being set up or launched. */
export type AuthorizeRead = {
  contributeOAuthRequest: ContributeOAuthRequest | null;
  contributeSetup: boolean;
  contributeOpen: boolean;
};

/** The signed-in viewer's state for one request, from the API's one read. */
export function authorizeStateFor(read: AuthorizeRead, requestId: string, login: string): AuthorizeState {
  const { contributeOAuthRequest: request, contributeSetup, contributeOpen } = read;
  // Null: Contribute is hidden from this account: being set up (a new account, read now), no profile here (launched),
  // or off the preview.
  if (!request) {
    if (contributeSetup) return { kind: 'setting-up', requestId };
    return { kind: contributeOpen ? 'no-profile' : 'not-open', requestId };
  }
  if (request.status === 'EXPIRED') return { kind: 'expired' };
  if (request.status === 'APPROVED') return { kind: 'approved', requestId, clientName: request.clientName };
  if (!request.previewAllowed) return { kind: 'not-open', requestId };
  return { kind: 'pending', requestId, login, request };
}

const LINK = 'font-semibold text-link hover:underline';

function Frame({ title, text, children }: { title: string; text?: ReactNode; children?: ReactNode }) {
  return (
    <Card className="w-full gap-5 rounded-2xl" data-authorize-card>
      <CardHeader className="gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">GitRanks Contribute</span>
        <CardTitle>
          <h1 className="text-2xl leading-tight font-bold text-balance">{title}</h1>
        </CardTitle>
        {text ? (
          <CardDescription className="text-base leading-normal text-foreground/80">{text}</CardDescription>
        ) : null}
      </CardHeader>
      {children}
    </Card>
  );
}

/** The signed-in ask: who asks, as whom, what it can and can't do, Allow and Cancel. */
function PendingCard({
  requestId,
  login,
  request,
}: {
  requestId: string;
  login: string;
  request: ContributeOAuthRequest;
}) {
  const named = request.clientName?.trim() || null;
  const where = clientWhereTextOf(request.clientWhere);
  const waiting = waitingLineOf(request.waiting);
  return (
    <Frame
      title={named ? `Connect ${named} to GitRanks Contribute` : 'Connect your agent to GitRanks Contribute'}
      text={
        <>
          {named ? `${named} (calls itself that · goes back to ${where.text})` : `An app (goes back to ${where.text})`}{' '}
          asks to work on Contribute as <strong className="font-semibold text-foreground">@{login}</strong>.
        </>
      }
    >
      <CardContent className="flex flex-col gap-4 text-sm">
        {where.warning ? (
          <p role="note" className="rounded-lg border border-warning/40 bg-warning-soft px-3.5 py-2.5 font-medium">
            {where.warning}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <p className="font-semibold">It will be able to:</p>
          <ul className="flex flex-col gap-2 text-foreground/80">
            {AGENT_CAN.map((line) => (
              <li key={line} className="flex gap-2.5">
                <CheckIcon aria-hidden="true" strokeWidth={2.4} className="mt-px size-4.5 flex-none text-positive" />
                {line}
              </li>
            ))}
          </ul>
        </div>
        <p className="flex gap-2.5 text-foreground/80">
          <XIcon aria-hidden="true" strokeWidth={2.4} className="mt-px size-4.5 flex-none text-muted-foreground" />
          {AGENT_CANNOT}
        </p>
        {request.replaces ? (
          <p className="font-medium" data-authorize="replaces">
            Connecting this disconnects {request.replaces.name}.
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-3">
        <AuthorizeActions requestId={requestId} clientName={named ?? undefined}>
          <p className="text-sm text-muted-foreground">
            You can disconnect it any time on the{' '}
            <Link href={settingsPathOf('own-agent')} prefetch={false} className={LINK}>
              Agent tab
            </Link>
            .
          </p>
          {waiting ? (
            <p className="text-sm text-muted-foreground" data-authorize="waiting">
              {waiting}
            </p>
          ) : null}
        </AuthorizeActions>
      </CardFooter>
    </Frame>
  );
}

/**
 * The consent page of an agent's sign-in to the MCP server, one card per state: the sign-in, the ask, the account being
 * set up, no profile, not open yet (the preview), allowed already, expired, or not readable now. No state is a dead
 * end: each one that can't go on says where the setup help is, and allowed already says what to ask the agent.
 */
export function AuthorizeScreen({ state }: { state: AuthorizeState }) {
  switch (state.kind) {
    case 'pending':
      return <PendingCard requestId={state.requestId} login={state.login} request={state.request} />;
    case 'signed-out':
      return (
        <Frame
          title="Sign in with GitHub to connect your agent"
          text="Your agent asks to work on GitRanks Contribute as you. Sign in first; you come straight back here to allow it. GitHub shares your public profile and email with us, read-only."
        >
          <CardFooter className="flex flex-col items-start gap-4">
            <AuthorizeSignIn requestId={state.requestId} />
            {REVIEW_SIGN_IN_SHOWN ? (
              <p className="text-sm text-muted-foreground">
                Reviewing this app for a directory?{' '}
                <Link
                  href={authorizeReviewHrefOf(state.requestId)}
                  prefetch={false}
                  className={LINK}
                  data-authorize="review-link"
                >
                  Use the review sign-in
                </Link>
              </p>
            ) : null}
          </CardFooter>
        </Frame>
      );
    case 'review-sign-in':
      return (
        <Frame
          title="Review sign-in"
          text="For app directory reviewers: sign in with the review account you were given. It connects the app to GitRanks Contribute's review account, nothing else."
        >
          <CardFooter className="flex flex-col items-stretch gap-4">
            <AuthorizeReviewSignIn requestId={state.requestId} />
            <p className="text-sm text-muted-foreground">
              Not a reviewer?{' '}
              <Link href={authorizeHrefOf(state.requestId)} prefetch={false} className={LINK}>
                Sign in with GitHub instead
              </Link>
            </p>
          </CardFooter>
        </Frame>
      );
    case 'not-open':
      return (
        <Frame
          title="Contribute isn't open for your account yet"
          text="GitRanks Contribute is in preview, so your agent can't connect to it yet."
        >
          <CardFooter className="flex flex-col items-start gap-4">
            <AuthorizeCancel requestId={state.requestId} />
            <AuthorizeDocsLine contact />
          </CardFooter>
        </Frame>
      );
    case 'setting-up':
      return (
        <Frame
          title={SETTING_UP_TITLE}
          text="GitRanks is reading your GitHub profile for the first time. This takes about a minute; then you can allow your agent here. This page updates by itself."
        >
          <CardFooter className="flex flex-wrap gap-2.5">
            <LearnSetupRefresh />
            <AuthorizeCancel requestId={state.requestId} />
            <SettingUpAutoRefresh />
          </CardFooter>
        </Frame>
      );
    case 'no-profile':
      return (
        <Frame
          title={NO_PROFILE_TITLE}
          text="GitRanks has not read your GitHub account, so Contribute is not open to it and your agent can't connect. If your account is new, try again in an hour: start again from your agent then."
        >
          <CardFooter className="flex flex-col items-start gap-4">
            <AuthorizeCancel requestId={state.requestId} />
            <AuthorizeDocsLine contact />
          </CardFooter>
        </Frame>
      );
    case 'approved':
      return (
        <Frame
          title="Already allowed"
          text={`You allowed ${state.clientName?.trim() || 'this app'} already. Go back to it: it is connected, or it starts the sign-in again.`}
        >
          <CardFooter className="flex flex-col items-stretch">
            <AuthorizeNextStep clientName={state.clientName?.trim() || undefined} />
          </CardFooter>
        </Frame>
      );
    case 'expired':
      return (
        <Frame
          title="This sign-in has expired"
          text={
            <>
              Start again from your agent: it opens a new one. Setting it up?{' '}
              <Link href={MCP_DOCS_PATH} prefetch={false} className={LINK}>
                The MCP docs
              </Link>{' '}
              show each agent&apos;s setup.
            </>
          }
        />
      );
    case 'unavailable':
      return (
        <Frame
          title="We can't read this sign-in right now"
          text="Reload the page in a minute, or cancel and start again from your agent."
        >
          <CardFooter className="flex flex-col items-start gap-4">
            <AuthorizeCancel requestId={state.requestId} />
            <AuthorizeDocsLine contact />
          </CardFooter>
        </Frame>
      );
  }
}
