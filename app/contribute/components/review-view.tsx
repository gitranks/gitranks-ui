import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ApprovalPanel, ChecksPanel, CostPanel, ReadinessPanel, ResultPanel, TimelinePanel } from './attempt-panels';
import { AttemptStatus } from './attempt-status';
import { DiffViewer } from './diff-viewer';
import { LiveRefresh } from './live-refresh';
import { PrForm } from './pr-form';
import { Pill } from './primitives';
import { ATTEMPT_STATES, attemptTitleOf, editableBodyOf, LIVE_STATES, repoOf } from '@/lib/contribute/attempt-format';
import { loadAttempt, loadContribute } from '@/lib/contribute/contribute.data';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';

export async function ReviewView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [view, attempt] = await Promise.all([loadContribute(), loadAttempt(id)]);
  if (!view || attempt === null) notFound();
  return <ReviewScreen view={view} attempt={attempt} />;
}

/** The repo's notes ask for a Developer Certificate of Origin sign-off. */
const DCO_ASKED = /\bDCO\b|signed-off-by|sign[- ]off/i;

const BackLink = () => (
  <Link href="/contribute/me" prefetch={false} className="text-sm">
    ← My contributions
  </Link>
);

/**
 * Review an attempt: where it stands, what the agent changed and why, our checks, the diff, the cost and the timeline;
 * in review, the pull request to submit. `attempt` is `undefined` while the API does not answer the review yet.
 */
export function ReviewScreen({
  view,
  attempt,
  now,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail | undefined;
  now?: Date;
}) {
  if (!attempt) {
    return (
      <div className="flex flex-col items-start gap-3" data-review="unavailable">
        <BackLink />
        <h1 className="text-[28px] font-bold tracking-tight">Reviews are not available yet</h1>
        <p className="text-muted-foreground">This is coming soon. Check back shortly.</p>
      </div>
    );
  }

  const state = ATTEMPT_STATES[attempt.state];
  const login = view.contributor?.login ?? 'you';
  const repo = repoOf(attempt);
  const inReview = attempt.state === 'REVIEW';

  return (
    <div className="flex flex-col gap-5" data-review={attempt.attemptId} data-state={attempt.state}>
      {LIVE_STATES.includes(attempt.state) ? <LiveRefresh /> : null}
      <div className="flex flex-col gap-2.5">
        <BackLink />
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill tone={state.tone}>{state.label}</Pill>
          {attempt.kind === 'FOLLOW_UP' ? <Pill>Follow-up</Pill> : null}
          <span className="font-mono text-sm text-muted-foreground">
            {attempt.url ? (
              <a href={attempt.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {repo} · issue #{attempt.number}
              </a>
            ) : (
              `${repo} · issue #${attempt.number}`
            )}
          </span>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-balance">{attemptTitleOf(attempt)}</h1>
      </div>

      <AttemptStatus attempt={attempt} now={now} />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
          <ResultPanel attempt={attempt} />
          <ChecksPanel attempt={attempt} />
          <DiffViewer patch={attempt.patch} />
        </div>
        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5">
          <CostPanel attempt={attempt} />
          {inReview ? (
            <PrForm
              attemptId={attempt.attemptId}
              issueNumber={attempt.number}
              repo={repo}
              defaultTitle={attempt.approval?.title || attempt.title?.trim() || `Fix #${attempt.number}`}
              defaultBody={editableBodyOf(attempt.approval?.body ?? attempt.result?.prBody)}
              login={login}
              dcoMode={view.contributor?.settings?.dco ?? null}
              dcoAsked={DCO_ASKED.test(attempt.readiness?.notes ?? '')}
              again={!!attempt.submit?.lastError}
            />
          ) : (
            <ApprovalPanel attempt={attempt} />
          )}
          <TimelinePanel attempt={attempt} />
          <ReadinessPanel attempt={attempt} />
        </aside>
      </div>
    </div>
  );
}
