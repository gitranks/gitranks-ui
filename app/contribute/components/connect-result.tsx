import { Check, TriangleAlert } from 'lucide-react';

import { Eyebrow } from './primitives';
import type { ContributeConnectKeyResult, ContributeConnectResult } from '@/lib/contribute/contribute.types';
import { dayLabel, maskedKey, shortId } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

/** The results that stored the key; every other one stored nothing. */
export const STORED_RESULTS: ReadonlySet<ContributeConnectResult> = new Set([
  'CONNECTED',
  'EXHAUSTED',
  'LIMIT_REACHED',
]);

const waitText = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return 'in a minute';
  if (seconds < 90) return `in ${seconds} seconds`;
  return `in about ${Math.round(seconds / 60)} minutes`;
};

/** What a key check's result means for the user: a title, what happened, and whether it is good news. */
export function connectResultCopy({ result, retryAfterSec, credential }: ContributeConnectKeyResult): {
  title: string;
  text: string;
  ok: boolean;
} {
  const until = credential?.blockedUntil ? dayLabel(credential.blockedUntil) : null;
  switch (result) {
    case 'CONNECTED':
      return {
        ok: true,
        title: 'Key works',
        text: credential?.ready
          ? 'Saved, and the agent is ready in your workspace.'
          : 'Saved. The agent is set up in your workspace when the first attempt starts.',
      };
    case 'EXHAUSTED':
      return {
        ok: true,
        title: 'Key works, but its credits are used up',
        text: `Saved. Nothing starts until your credits renew${until ? ` on ${until}` : ''}, and nothing is spent beyond them.`,
      };
    case 'LIMIT_REACHED':
      return {
        ok: true,
        title: "Key works, but its workspace's spend limit is reached",
        text: `Saved. Work starts ${until ? `on ${until}` : 'when the limit resets on the 1st'}, or sooner if you raise the limit in the Claude Console.`,
      };
    case 'INVALID':
      return {
        ok: false,
        title: 'Anthropic refused this key',
        text: 'Check that you copied all of it and that it was not deleted in the Console. Nothing was saved.',
      };
    case 'MANAGED_AGENTS_UNAVAILABLE':
      return {
        ok: false,
        title: 'This key cannot run hosted agents',
        text: "The key works, but its organization or workspace may not use Claude Managed Agents, which every attempt runs on. Nothing was saved. Check the workspace's access in the Console, or use a key from another organization.",
      };
    case 'RATE_LIMITED':
      return {
        ok: false,
        title: 'Anthropic is rate limiting this key',
        text: `Nothing was saved. Try again ${waitText(retryAfterSec)}.`,
      };
    case 'UNAVAILABLE':
      return {
        ok: false,
        title: 'Anthropic did not answer',
        text: 'Their API is busy or down right now. Nothing was saved; try again in a few minutes.',
      };
    case 'REFUSED':
      return {
        ok: false,
        title: 'Anthropic refused the check',
        text: 'It answered with an error we did not expect. Nothing was saved. Try again, or create a new key.',
      };
  }
}

/** The key check's outcome, under the form. */
export function ConnectResult({ outcome }: { outcome: ContributeConnectKeyResult }) {
  const copy = connectResultCopy(outcome);
  const { credential } = outcome;
  const Icon = copy.ok ? Check : TriangleAlert;

  return (
    <div role="status" data-result={outcome.result} className="flex flex-col gap-1.5 border-t pt-4">
      <Eyebrow>After the check</Eyebrow>
      <span className={cn('flex items-center gap-2 font-semibold', copy.ok ? 'text-positive' : 'text-warning')}>
        <Icon className="size-4" aria-hidden="true" />
        {copy.title}
      </span>
      <span className="text-sm text-muted-foreground">{copy.text}</span>
      {credential && STORED_RESULTS.has(outcome.result) ? (
        <span className="font-mono text-sm text-muted-foreground">
          {maskedKey(credential.last4)}
          {credential.workspaceId ? ` · workspace ${shortId(credential.workspaceId)}` : ''}
          {credential.ready ? ' · agent ready' : ''}
        </span>
      ) : null}
    </div>
  );
}
