'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState, useTransition } from 'react';

import { removeClaudeKey, revokeGithubGrant } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { HEADING, Panel } from './primitives';
import { useGrantGithub } from './use-grant-github';
import { Button } from '@/components/ui/button';
import type { ContributeCredential, ContributeGrant } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { dayLabel, maskedKey, relativeLabel, shortId } from '@/lib/contribute/format';
import type { GrantRefusal } from '@/lib/contribute/grant-refusal';
import { cn } from '@/lib/utils';

/** Where a user revokes an OAuth App themselves. */
export const GITHUB_APPS_URL = 'https://github.com/settings/applications';

const KEY_STATES: Record<ContributeCredential['state'], string> = {
  VALID: 'works',
  INVALID: 'refused by Anthropic',
  EXHAUSTED: 'credits used up',
  LIMIT_REACHED: 'workspace limit reached',
};

function Row({ title, detail, children }: { title: string; detail: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3.5 last:border-b-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{detail}</span>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

/** The Claude key's line: what we keep of it, and its removal (which tells the user to delete it in the Console). */
function KeyRow({ credential, now }: { credential: ContributeCredential | undefined; now?: Date }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const done = useRef<HTMLSpanElement>(null);
  // The button and its dialog are gone once the key is: the focus goes to the line that says so.
  useEffect(() => {
    if (message) done.current?.focus();
  }, [message]);

  const remove = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeClaudeKey();
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setConfirming(false);
      setMessage('Removed. Delete the key in the Claude Console too, so it cannot be used anywhere.');
      router.refresh();
    });

  const said = message ? (
    <span ref={done} role="status" tabIndex={-1} className="outline-none">
      {message}
    </span>
  ) : null;

  if (!credential) {
    return (
      <Row title="Claude API key" detail={said ?? 'Not connected'}>
        <Button asChild variant="outline" className="h-10">
          <Link href="/contribute/connect" prefetch={false}>
            Connect
          </Link>
        </Button>
      </Row>
    );
  }

  const detail = (
    <span data-key-state={credential.state}>
      <span className="font-mono">{maskedKey(credential.last4)}</span>
      {credential.workspaceId ? <span className="font-mono"> · {shortId(credential.workspaceId)}</span> : null}
      {' · '}
      {KEY_STATES[credential.state]}
      {credential.blockedUntil && credential.state !== 'INVALID' ? ` until ${dayLabel(credential.blockedUntil)}` : ''}
      {` · checked ${relativeLabel(credential.checkedAt, now)}`}
      {credential.state === 'VALID' && !credential.ready ? ' · the agent is set up at the first attempt' : ''}
    </span>
  );

  return (
    <Row title="Claude API key" detail={said ?? detail}>
      {credential.state === 'INVALID' ? (
        <Button asChild variant="outline" className="h-10">
          <Link href="/contribute/connect" prefetch={false}>
            Connect a new key
          </Link>
        </Button>
      ) : null}
      {message ? null : (
        <ConfirmDialog
          trigger={
            <Button type="button" variant="destructive-outline" className="h-10">
              Remove key
            </Button>
          }
          open={confirming}
          onOpenChange={(open) => {
            if (open) setError(null);
            setConfirming(open);
          }}
          title="Remove your Claude key?"
          description="No new attempts start with it. To use it again, connect it again. Delete it in the Claude Console too, so it cannot be used anywhere."
          action="Remove key"
          pendingAction="Removing…"
          pending={pending}
          error={error}
          onConfirm={remove}
        />
      )}
    </Row>
  );
}

/** The GitHub grant's line: connect when missing, revoke when there. */
function GrantRow({ grant, available }: { grant: ContributeGrant | undefined; available: boolean }) {
  const router = useRouter();
  const { grant: allow, pending: granting } = useGrantGithub('/contribute/settings#access');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<ReactNode>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (message) done.current?.focus();
  }, [message]);

  const revoke = () =>
    startTransition(async () => {
      setError(null);
      const result = await revokeGithubGrant();
      if (result.ok) {
        setConfirming(false);
        setMessage('Revoked. Pull requests can no longer be opened for you.');
        router.refresh();
        return;
      }
      setError(
        result.error === 'NOT_AVAILABLE_YET' ? (
          <>
            Revoking here is not available yet. Revoke it on GitHub:{' '}
            <a href={GITHUB_APPS_URL} target="_blank" rel="noopener noreferrer" className="underline">
              Authorized OAuth Apps
            </a>
            .
          </>
        ) : (
          contributeErrorMessage(result.error, result.message)
        ),
      );
    });

  const detail = grant?.connected
    ? `public_repo${grant.login ? `, as @${grant.login}` : ''}`
    : !available
      ? 'Not available yet. It is coming soon.'
      : grant === undefined
        ? 'Status not available yet. Grant it, or revoke it on GitHub, any time.'
        : 'Not allowed: pull requests cannot be opened for you';

  return (
    <div
      data-grant={grant === undefined ? 'unknown' : grant.connected ? 'connected' : 'missing'}
      data-grant-available={available}
    >
      <Row
        title="GitHub pull requests"
        detail={
          message ? (
            <span ref={done} role="status" tabIndex={-1} className="outline-none">
              {message}
            </span>
          ) : (
            detail
          )
        }
      >
        {grant?.connected && !message ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive-outline" className="h-10">
                Revoke
              </Button>
            }
            open={confirming}
            onOpenChange={(open) => {
              if (open) setError(null);
              setConfirming(open);
            }}
            title="Revoke GitHub access?"
            description="Pull requests can no longer be opened for you until you allow it on GitHub again."
            action="Revoke access"
            pendingAction="Revoking…"
            pending={pending}
            error={error}
            onConfirm={revoke}
          />
        ) : !grant?.connected && available ? (
          <Button type="button" variant="outline" onClick={allow} disabled={granting} className="h-10">
            {granting ? 'Opening GitHub…' : 'Allow on GitHub'}
          </Button>
        ) : null}
      </Row>
    </div>
  );
}

/** Why GitHub's consent was not saved, from the `grant` query it came back with. */
const REFUSALS: Record<GrantRefusal, string> = {
  refused:
    'GitHub access was not saved: it must come from the GitHub account you are signed in with. Sign out of other accounts on github.com and try again.',
  unavailable: 'GitHub access was not saved: pull request access is not available yet.',
};

export function AccessSection({
  credential,
  grant,
  grantAvailable,
  grantRefusal,
  now,
}: {
  credential: ContributeCredential | undefined;
  grant: ContributeGrant | undefined;
  grantAvailable: boolean;
  /** GitHub sent back another account than the one signed in, or a grant that cannot be stored here. */
  grantRefusal?: GrantRefusal;
  now?: Date;
}) {
  return (
    <Panel id="access" className="gap-1">
      <h2 className={cn(HEADING.section, 'mb-2.5')}>Keys and access</h2>
      {grantRefusal ? (
        <p role="alert" data-grant-refusal={grantRefusal} className="text-sm text-destructive">
          {REFUSALS[grantRefusal]} GitHub may still list GitRanks Contribute as authorized; you may want to revoke it in{' '}
          <a href={GITHUB_APPS_URL} target="_blank" rel="noopener noreferrer" className="underline">
            Authorized OAuth Apps
          </a>
          .
        </p>
      ) : null}
      <KeyRow credential={credential} now={now} />
      <GrantRow grant={grant} available={grantAvailable} />
      <Row title="Your own agent (MCP)" detail="Tokens for Claude Code, Codex, Cursor or Gemini CLI on your machine.">
        <Button asChild variant="outline" className="h-10">
          <a href="#own-agent">Tokens</a>
        </Button>
      </Row>
    </Panel>
  );
}
