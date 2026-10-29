'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import { removeClaudeKey, revokeGithubGrant } from '../actions';
import { useGrantGithub } from './grant-card';
import { Panel } from './primitives';
import type { ContributeCredential, ContributeGrant } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { dayLabel, maskedKey, relativeLabel, shortId } from '@/lib/contribute/format';

/** Where a user revokes an OAuth App themselves. */
export const GITHUB_APPS_URL = 'https://github.com/settings/applications';

const KEY_STATES: Record<ContributeCredential['state'], string> = {
  VALID: 'works',
  INVALID: 'refused by Anthropic',
  EXHAUSTED: 'credits used up',
  LIMIT_REACHED: 'workspace limit reached',
};

const dangerButton =
  'min-h-10 rounded-lg border bg-background px-3.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40';
const plainButton =
  'min-h-10 rounded-lg border bg-background px-3.5 text-sm font-medium hover:bg-accent disabled:opacity-50';

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
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const result = await removeClaudeKey();
      setConfirming(false);
      if (!result.ok) {
        setMessage(contributeErrorMessage(result.error, result.message));
        return;
      }
      setMessage('Removed. Delete the key in the Claude Console too, so it cannot be used anywhere.');
      router.refresh();
    });

  if (!credential) {
    return (
      <Row title="Claude API key" detail={message ?? 'Not connected'}>
        <Link href="/contribute/connect" prefetch={false} className={`${plainButton} inline-flex items-center`}>
          Connect
        </Link>
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
    <Row title="Claude API key" detail={message ?? detail}>
      {credential.state === 'INVALID' ? (
        <Link href="/contribute/connect" prefetch={false} className={`${plainButton} inline-flex items-center`}>
          Connect a new key
        </Link>
      ) : null}
      {confirming ? (
        <>
          <button type="button" onClick={remove} disabled={pending} className={dangerButton}>
            {pending ? 'Removing…' : 'Yes, remove it'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className={plainButton}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={dangerButton}>
          Remove key
        </button>
      )}
    </Row>
  );
}

/** The GitHub grant's line: connect when missing, revoke when there. */
function GrantRow({ grant }: { grant: ContributeGrant | undefined }) {
  const router = useRouter();
  const { grant: allow, pending: granting } = useGrantGithub('/contribute/settings#access');
  const [message, setMessage] = useState<ReactNode>(null);
  const [pending, startTransition] = useTransition();

  const revoke = () =>
    startTransition(async () => {
      const result = await revokeGithubGrant();
      if (result.ok) {
        setMessage('Revoked. Pull requests can no longer be opened for you.');
        router.refresh();
        return;
      }
      setMessage(
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

  const detail =
    grant === undefined
      ? 'Status not available yet. Grant it, or revoke it on GitHub, any time.'
      : grant.connected
        ? `public_repo${grant.login ? `, as @${grant.login}` : ''}`
        : 'Not allowed: pull requests cannot be opened for you';

  return (
    <div data-grant={grant === undefined ? 'unknown' : grant.connected ? 'connected' : 'missing'}>
      <Row title="GitHub pull requests" detail={message ?? detail}>
        {grant?.connected ? (
          <button type="button" onClick={revoke} disabled={pending} className={dangerButton}>
            {pending ? 'Revoking…' : 'Revoke'}
          </button>
        ) : (
          <button type="button" onClick={allow} disabled={granting} className={plainButton}>
            {granting ? 'Opening GitHub…' : 'Allow on GitHub'}
          </button>
        )}
      </Row>
    </div>
  );
}

export function AccessSection({
  credential,
  grant,
  grantRefused = false,
  now,
}: {
  credential: ContributeCredential | undefined;
  grant: ContributeGrant | undefined;
  /** GitHub sent back another account than the one signed in. */
  grantRefused?: boolean;
  now?: Date;
}) {
  return (
    <Panel id="access" className="gap-1">
      <h2 className="mb-2.5 text-lg font-semibold">Keys and access</h2>
      {grantRefused ? (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          GitHub access was not saved: it must come from the GitHub account you are signed in with. Sign out of other
          accounts on github.com and try again.
        </p>
      ) : null}
      <KeyRow credential={credential} now={now} />
      <GrantRow grant={grant} />
      <Row title="Your own agent (MCP)" detail="Use Claude Code, Codex or Cursor on your machine. Coming soon.">
        <button type="button" disabled className={plainButton}>
          Create token
        </button>
      </Row>
    </Panel>
  );
}
