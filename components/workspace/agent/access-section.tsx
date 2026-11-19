'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/workspace/confirm-dialog';
import { Panel } from '@/components/workspace/primitives';
import { useGrantGithub } from '@/components/workspace/use-grant-github';
import { removeClaudeKey, revokeGithubGrant } from '@/lib/workspace/actions';
import type { ContributeCredential, ContributeGrant } from '@/lib/workspace/contribute.types';
import { contributeErrorMessage } from '@/lib/workspace/errors';
import { dayLabel, maskedKey, relativeLabel, shortId } from '@/lib/workspace/format';
import type { GrantRefusal } from '@/lib/workspace/grant-refusal';
import { GITHUB_APPS_URL } from '@/lib/workspace/org-access';
import { GITHUB_ACCESS_PATH, KEY_REPLACE_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { grantSummaryOf, KEY_STATES } from '@/lib/workspace/settings-summary';

export { GITHUB_APPS_URL };

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
          <Link href={WORKSPACE_PATHS.agentKey} prefetch={false}>
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
          <Link href={KEY_REPLACE_PATH} prefetch={false}>
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
  const { grant: allow, pending: granting } = useGrantGithub(GITHUB_ACCESS_PATH);
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

  const detail = grantSummaryOf(grant, available);

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

/** The Claude key the hosted agent runs on: what we keep of it, and its removal; connect one when there is none. */
export function KeyPanel({ credential, now }: { credential: ContributeCredential | undefined; now?: Date }) {
  return (
    <Panel id="access" className="gap-1">
      <KeyRow credential={credential} now={now} />
    </Panel>
  );
}

/**
 * GitHub's permission to open pull requests for the user, whichever agent works for them: allow it, see it, revoke it;
 * and why GitHub's consent was not saved, when it came back with a `grant` refusal.
 */
export function GithubAccessSection({
  grant,
  grantAvailable,
  grantRefusal,
}: {
  grant: ContributeGrant | undefined;
  grantAvailable: boolean;
  /** GitHub sent back another account than the one signed in, or a grant that cannot be stored here. */
  grantRefusal?: GrantRefusal;
}) {
  return (
    <Panel id="github" className="scroll-mt-20 gap-1">
      {grantRefusal ? (
        <p role="alert" data-grant-refusal={grantRefusal} className="text-sm text-destructive">
          {REFUSALS[grantRefusal]} GitHub may still list GitRanks Contribute as authorized; you may want to revoke it in{' '}
          <a href={GITHUB_APPS_URL} target="_blank" rel="noopener noreferrer" className="underline">
            Authorized OAuth Apps
          </a>
          .
        </p>
      ) : null}
      <GrantRow grant={grant} available={grantAvailable} />
    </Panel>
  );
}
