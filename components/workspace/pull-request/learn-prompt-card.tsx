import type { Route } from 'next';
import Link from 'next/link';

import { MarkHandledButton } from './follow-up-buttons';
import { allKindsOf } from './move-card';
import type { CardProps } from './move-props';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/workspace/code-block';
import { CopyButton } from '@/components/workspace/copy-button';
import { HEADING } from '@/components/workspace/primitives';
import { learnFollowUpPromptOf } from '@/lib/learn/learn-view';
import { AGENT_NAMES, githubUrlOf } from '@/lib/workspace/attempt-format';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/workspace/contribute.types';
import { relativeLabel } from '@/lib/workspace/format';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { lastUsedTokenOf } from '@/lib/workspace/proof';

/** The agent that wrote the first fix, by name: "Claude Code"; "your agent" for one it does not name. */
const agentNameOf = (first: ContributeAttemptDetail) =>
  first.agent && first.agent.name !== 'OTHER' ? AGENT_NAMES[first.agent.name] : null;

/** The connection the agent calls with last: "Claude Code is connected · last call 2 hours ago". Null with none. */
function connectionOf(view: ContributeView, name: string | null, now: Date): string | null {
  const token = lastUsedTokenOf(view.ownAgent?.tokens);
  if (!token?.lastUsedAt) return null;
  const when = relativeLabel(token.lastUsedAt, now);
  return [`${name ?? 'Your agent'} is connected`, when ? `last call ${when}` : null].filter(Boolean).join(' · ');
}

/**
 * A change a maintainer asked for on a Learn pull request (W1 §8.6 state 10): the person's own agent makes it, they
 * read it and push. Never the hosted agent: no run to start, no note for it, also for a person with a Claude key. The
 * prompt names the pull request by its address; the agent finds the rest. When the agent starts, the poll names the
 * attempts, the page reads itself again and shows the run.
 */
export function LearnPromptCard({ move, first, view, now, round }: CardProps & { round: number }) {
  if (!first) return null;
  const prUrl = githubUrlOf(first.pullRequest?.url) ?? '';
  const prompt = learnFollowUpPromptOf(prUrl, first.pullRequest?.prId ?? '');
  const name = agentNameOf(first);
  const connection = connectionOf(view, name, now);
  const kinds = move.data.card === 'next-run' ? move.data.kinds : [];
  const threadUrl = githubUrlOf(first.reviewFeedback?.threads.find(({ ignored }) => !ignored)?.url) ?? prUrl;
  return (
    <div className="flex flex-col gap-3" data-move="learn-prompt" id={move.kinds[0]}>
      <section
        aria-labelledby="learn-prompt-title"
        className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-card p-4 ring-2 ring-primary/10 sm:p-5"
      >
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-xs tracking-wider text-muted-foreground uppercase">Change {round}</span>
          <h2 id="learn-prompt-title" className="text-lg font-semibold">
            Your move
          </h2>
          <p className="text-sm text-muted-foreground">
            A follow-up change needs no new lesson: your agent makes it, you read it and push.
          </p>
        </div>
        <div className="flex flex-col gap-3 border-t pt-4" data-prompt-step="1">
          <h3 className={HEADING.block}>1 · Ask your agent to make the change</h3>
          {connection ? null : (
            <Button asChild className="min-h-11 self-start px-5 font-semibold max-sm:w-full">
              <Link href={WORKSPACE_PATHS.agentConnect} prefetch={false}>
                Connect your agent
              </Link>
            </Button>
          )}
          <CodeBlock label={`Paste this in ${name ?? 'your agent'}, in any folder`} copyLabel="Copy" wrap>
            {prompt}
          </CodeBlock>
          {connection ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <CopyButton text={prompt} label="Copy the prompt" variant="default" className="max-sm:w-full" />
              <p className="text-sm text-muted-foreground" data-connection="">
                {connection} · this page moves on by itself when it starts
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 border-t pt-4" data-prompt-step="2">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`${HEADING.block} text-muted-foreground`}>2 · Read what changed, then push it</h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">After step 1</span>
          </div>
          <p className="text-sm text-muted-foreground">Nothing reaches GitHub before you push.</p>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {threadUrl ? (
          <a href={threadUrl as Route} target="_blank" rel="noopener noreferrer" className="font-semibold text-link">
            Reply to the maintainer ↗<span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : null}
        {first.pullRequest?.prId && kinds.length ? (
          <>
            <span aria-hidden="true" className="text-muted-foreground">
              ·
            </span>
            <MarkHandledButton
              prId={first.pullRequest.prId}
              prNumber={first.pullRequest.number}
              kinds={kinds}
              all={allKindsOf(first, kinds)}
              label="Stop working on this pull request"
              look="link"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
