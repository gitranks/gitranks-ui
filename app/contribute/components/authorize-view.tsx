import { CheckIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AuthorizeActions, AuthorizeCancel, AuthorizeSignIn } from './authorize-actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContributeOAuthRequest } from '@/lib/contribute/contribute.types';
import { MCP_DOCS_PATH } from '@/lib/contribute/contribute-path';
import { AGENT_CAN, AGENT_CANNOT, clientWhereTextOf, waitingLineOf } from '@/lib/contribute/oauth-consent';
import { settingsPathOf } from '@/lib/contribute/settings-paths';

/** What the consent page shows: one state per variant of the copy. */
export type AuthorizeState =
  /** No session: the sign-in first, back to this page. */
  | { kind: 'signed-out'; requestId: string }
  /** Signed in, and the request waits for Allow. */
  | { kind: 'pending'; requestId: string; login: string; request: ContributeOAuthRequest }
  /** Contribute is not open for this account yet: Cancel alone. */
  | { kind: 'not-open'; requestId: string }
  /** Allowed already. */
  | { kind: 'approved'; requestId: string; clientName: string | null }
  /** Unknown, expired or used, or a link without a request. */
  | { kind: 'expired' }
  /** The request could not be read now. */
  | { kind: 'unavailable'; requestId: string };

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
  const name = request.clientName?.trim() || 'An app';
  const where = clientWhereTextOf(request.clientWhere);
  const waiting = waitingLineOf(request.waiting);
  return (
    <Frame
      title={`Connect ${name} to GitRanks Contribute`}
      text={
        <>
          {name} (calls itself that · goes back to {where.text}) asks to work on Contribute as{' '}
          <strong className="font-semibold text-foreground">@{login}</strong>.
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
        <AuthorizeActions requestId={requestId} clientName={name} />
        <p className="text-sm text-muted-foreground">
          You can disconnect it any time in{' '}
          <Link href={settingsPathOf('own-agent')} prefetch={false} className={LINK}>
            Settings
          </Link>
          .
        </p>
        {waiting ? (
          <p className="text-sm text-muted-foreground" data-authorize="waiting">
            {waiting}
          </p>
        ) : null}
      </CardFooter>
    </Frame>
  );
}

/**
 * The consent page of an agent's sign-in to the MCP server, one card per state: the sign-in, the ask, not open yet,
 * allowed already, expired, or not readable now.
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
          <CardFooter>
            <AuthorizeSignIn requestId={state.requestId} />
          </CardFooter>
        </Frame>
      );
    case 'not-open':
      return (
        <Frame
          title="Contribute isn't open for your account yet"
          text="GitRanks Contribute is in preview, so your agent can't connect to it yet."
        >
          <CardFooter>
            <AuthorizeCancel requestId={state.requestId} />
          </CardFooter>
        </Frame>
      );
    case 'approved':
      return (
        <Frame
          title="Already allowed"
          text={`You allowed ${state.clientName?.trim() || 'this app'} already. Go back to it: it is connected, or it starts the sign-in again.`}
        />
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
          <CardFooter>
            <AuthorizeCancel requestId={state.requestId} />
          </CardFooter>
        </Frame>
      );
  }
}
