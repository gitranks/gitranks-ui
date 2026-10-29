'use client';

import type { Route } from 'next';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { Eyebrow } from './primitives';
import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';
import type { ContributeGrant } from '@/lib/contribute/contribute.types';

/** Starts GitHub's consent for pull request access; GitHub sends the user back to `returnTo`. */
export function useGrantGithub(returnTo: Route) {
  const [pending, setPending] = useState(false);
  const grant = () => {
    setPending(true);
    signIn(CONTRIBUTE_PROVIDER, { redirectTo: returnTo }).catch(() => setPending(false));
  };
  return { grant, pending };
}

/** Step 3: what the GitHub access allows, and the button to grant it. */
export function GrantCard({ grant, returnTo }: { grant: ContributeGrant | undefined; returnTo: Route }) {
  const { grant: allow, pending } = useGrantGithub(returnTo);

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-5 sm:p-6" data-grant={grantStateOf(grant)}>
      <Eyebrow>Step 3 · GitHub access</Eyebrow>
      <span className="text-[17px] font-semibold">Let us open pull requests for you</span>
      <ul className="flex list-disc flex-col gap-1 pl-4.5 text-sm text-foreground/80">
        <li>Fork a repo into your account and push a branch to the fork</li>
        <li>Open the PR on the original repo, in your name</li>
        <li>Never anything on private repos, and never workflow files</li>
      </ul>
      <span className="text-sm text-muted-foreground">
        GitHub will ask for the <code className="font-mono">public_repo</code> permission, and nothing more: without the{' '}
        <code className="font-mono">workflow</code> permission GitHub itself refuses any change to a repo's workflows.
        Revoke it on GitHub or in Settings any time.
      </span>
      {grant?.connected ? (
        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
          Allowed{grant.login ? `, as @${grant.login}` : ''}
        </span>
      ) : (
        <>
          <button
            type="button"
            onClick={allow}
            disabled={pending}
            className="min-h-11 self-start rounded-lg border border-foreground bg-foreground px-4.5 font-semibold text-background disabled:opacity-60"
          >
            {pending ? 'Opening GitHub…' : 'Allow on GitHub'}
          </button>
          {grant === undefined ? (
            <span className="text-sm text-muted-foreground">
              Whether access was granted is not shown yet; granting it again is harmless.
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

export const grantStateOf = (grant: ContributeGrant | undefined) =>
  grant === undefined ? 'unknown' : grant.connected ? 'connected' : 'missing';
