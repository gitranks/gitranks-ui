'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState, useTransition } from 'react';

import { removeClaudeKey, revokeGithubGrant } from '../actions';
import { Panel } from './primitives';
import { useGrantGithub } from './use-grant-github';
import { Button } from '@/components/ui/button';
import type { ContributeCredential, ContributeGrant } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { dayLabel, maskedKey, relativeLabel, shortId } from '@/lib/contribute/format';
import type { GrantRefusal } from '@/lib/contribute/grant-refusal';

/** Where a user revokes an OAuth App themselves. */
export const GITHUB_APPS_URL = 'https://github.com/settings/applications';

const KEY_STATES: Record<ContributeCredential['state'], string> = {
  VALID: 'works',
  INVALID: 'refused by Anthropic',
  EXHAUSTED: 'credits used up',
  LIMIT_REACHED: 'workspace limit reached',
};

/** The rows' controls keep their 40px height. */
const dangerButton = 'h-10 text-destructive hover:bg-destructive/10 hover:text-destructive';

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
    <Row title="Claude API key" detail={message ?? detail}>
      {credential.state === 'INVALID' ? (
        <Button asChild variant="outline" className="h-10">
          <Link href="/contribute/connect" prefetch={false}>
            Connect a new key
          </Link>
        </Button>
      ) : null}
      {confirming ? (
        <>
          <Button type="button" variant="outline" onClick={remove} disabled={pending} className={dangerButton}>
            {pending ? 'Removing…' : 'Yes, remove it'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setConfirming(false)} className="h-10">
            Cancel
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" onClick={() => setConfirming(true)} className={dangerButton}>
          Remove key
        </Button>
      )}
    </Row>
  );
}

/** The GitHub grant's line: connect when missing, revoke when there. */
function GrantRow({ grant, available }: { grant: ContributeGrant | undefined; available: boolean }) {
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
      <Row title="GitHub pull requests" detail={message ?? detail}>
        {grant?.connected ? (
          <Button type="button" variant="outline" onClick={revoke} disabled={pending} className={dangerButton}>
            {pending ? 'Revoking…' : 'Revoke'}
          </Button>
        ) : available ? (
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
      <h2 className="mb-2.5 text-lg font-semibold">Keys and access</h2>
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
