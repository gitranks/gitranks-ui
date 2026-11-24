'use client';

import { SquareTerminal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { Pill } from '@/components/pill/pill';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/workspace/confirm-dialog';
import { HEADING } from '@/components/workspace/primitives';
import { cn } from '@/lib/utils';
import { revokeMcpToken } from '@/lib/workspace/actions';
import type { ContributeMcpToken, ContributeOwnAgent } from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import { dayLabel, relativeLabel } from '@/lib/workspace/format';
import { isSignedInAgent } from '@/lib/workspace/oauth-consent';
import { MCP_DOCS_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** Said under the connections: the agent works on strangers' text. */
export const OWN_AGENT_SAFETY = 'Your agent reads issue text written by strangers. Keep its permission prompts on.';

/** A connection's line: its last call, then the token's last 4 or when the agent signed in. */
export function connectionLineOf(token: ContributeMcpToken, now: Date): string {
  const call = token.lastUsedAt ? `Last call ${relativeLabel(token.lastUsedAt, now)}` : 'No call yet';
  return isSignedInAgent(token)
    ? `${call} · signed in ${dayLabel(token.createdAt)}`
    : `${call} · token gr_…${token.last4 ?? ''}`;
}

/** Connected once the agent called with it, or signed in; a token not used yet is only live. */
const isConnected = (token: ContributeMcpToken) => isSignedInAgent(token) || !!token.lastUsedAt;

/** One connection: the agent and where, whether it called, and Revoke (Disconnect for one that signed in). */
function ConnectionCard({ token, now }: { token: ContributeMcpToken; now?: Date }) {
  const signedIn = isSignedInAgent(token);
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Revoked: the card says so, without its button, until the page reads the connections again. */
  const [revoked, setRevoked] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (revoked) done.current?.focus();
  }, [revoked]);

  const revoke = () =>
    startTransition(async () => {
      setError(null);
      const result = await revokeMcpToken(token.id);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setConfirming(false);
      setRevoked(true);
      router.refresh();
    });

  return (
    <li
      data-mcp-token={token.id}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3.5"
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
      >
        <SquareTerminal className="size-4" />
      </span>
      <span className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {token.name}
          {revoked ? null : isConnected(token) ? (
            <Pill tone="green">Connected</Pill>
          ) : (
            <Pill tone="neutral">Not used yet</Pill>
          )}
        </span>
        {revoked ? (
          <span ref={done} role="status" tabIndex={-1} className="text-sm text-muted-foreground outline-none">
            {signedIn
              ? 'Disconnected. It can no longer reach us.'
              : 'Revoked. An agent using it can no longer reach us.'}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{connectionLineOf(token, now ?? new Date())}</span>
        )}
      </span>
      {revoked ? null : (
        <ConfirmDialog
          trigger={
            <Button
              type="button"
              variant="ghost"
              className="ml-auto min-h-10 px-2 text-sm underline underline-offset-4 max-sm:ml-12"
            >
              {signedIn ? 'Disconnect' : 'Revoke'}
              <span className="sr-only"> {token.name}</span>
            </Button>
          }
          open={confirming}
          onOpenChange={(open) => {
            if (open) setError(null);
            setConfirming(open);
          }}
          title={signedIn ? `Disconnect "${token.name}"?` : `Revoke "${token.name}"?`}
          description={
            signedIn
              ? 'It can no longer reach us, and the issues it is working on go back if it is your only connection. Sign in from it again to reconnect.'
              : 'An agent using this token can no longer reach us, and the token cannot be brought back. Connect it again with a new one.'
          }
          action={signedIn ? 'Disconnect' : 'Revoke token'}
          pendingAction={signedIn ? 'Disconnecting…' : 'Revoking…'}
          pending={pending}
          error={error}
          onConfirm={revoke}
        />
      )}
    </li>
  );
}

const MCP_DOCS_LINK =
  'inline-flex items-center self-center text-sm font-semibold text-link hover:underline max-sm:min-h-11';

/**
 * The Agent tab's "Your own agent" (`#own-agent`): one card per live connection, each with Revoke, then "Connect another
 * agent" and the MCP docs. None: "No agent is connected." and Connect your agent. `ownAgent` is `undefined` when its
 * read failed. The chip says what it serves: Contribute and Learn, or Contribute while Learn is not open.
 */
export function OwnAgentBlock({
  ownAgent,
  learnOpen,
  now,
}: {
  ownAgent: ContributeOwnAgent | undefined;
  learnOpen: boolean;
  now?: Date;
}) {
  const tokens = ownAgent?.tokens ?? [];
  return (
    <section id="own-agent" aria-labelledby="own-agent-title" className="flex scroll-mt-20 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 id="own-agent-title" className={HEADING.section}>
          Your own agent
        </h2>
        <Pill tone="neutral">{learnOpen ? 'For Contribute and Learn' : 'For Contribute'}</Pill>
      </div>
      {ownAgent === undefined ? (
        <p
          className="rounded-xl border border-dashed px-4 py-3.5 text-sm text-muted-foreground"
          data-own-agent="failed"
        >
          Your connections didn&apos;t load. Reload to try again.
        </p>
      ) : tokens.length ? (
        <>
          <ul className="flex flex-col gap-2" data-own-agent="connected">
            {tokens.map((token) => (
              <ConnectionCard key={token.id} token={token} now={now} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={WORKSPACE_PATHS.agentConnect}
              prefetch={false}
              className={cn(buttonVariants({ variant: 'outline' }), 'min-h-10 px-4')}
            >
              Connect another agent
            </Link>
            <Link href={MCP_DOCS_PATH} prefetch={false} className={MCP_DOCS_LINK}>
              The MCP docs: setup and tools for every agent →
            </Link>
          </div>
          <p data-safety="" className="text-sm font-medium">
            {OWN_AGENT_SAFETY}
          </p>
        </>
      ) : (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-3.5"
          data-own-agent="none"
        >
          <span className="text-sm text-muted-foreground">No agent is connected.</span>
          <Link
            href={WORKSPACE_PATHS.agentConnect}
            prefetch={false}
            className={cn(buttonVariants(), 'min-h-10 px-4 font-semibold')}
          >
            Connect your agent
          </Link>
        </div>
      )}
    </section>
  );
}
