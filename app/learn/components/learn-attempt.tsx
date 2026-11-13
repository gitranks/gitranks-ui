import { GitPullRequest, GraduationCap, type LucideIcon, Terminal } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { LESSON_GRID, LessonFlow, type LessonFlowStart, StepArticle } from './lesson-flow';
import { LessonShare } from './lesson-share';
import { StageStrip } from './stage-strip';
import { WrittenFor } from './written-for';
import {
  ChecksPanel,
  CostPanel,
  ReadinessPanel,
  TimelinePanel,
  YourNotePanel,
} from '@/app/contribute/components/attempt-panels';
import { Box } from '@/app/contribute/components/attempt-status';
import { DiffViewer } from '@/app/contribute/components/diff-viewer';
import { PrForm } from '@/app/contribute/components/pr-form';
import { HEADING } from '@/app/contribute/components/primitives';
import { prFormPropsOf } from '@/app/contribute/components/review-view';
import { SendBackForm } from '@/app/contribute/components/send-back-form';
import { type SessionTab, SessionTabs } from '@/app/contribute/components/session-tabs';
import { isOwnAgent } from '@/lib/contribute/attempt-format';
import { loadAttempt, loadContribute } from '@/lib/contribute/contribute.data';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/contribute/contribute.types';
import { parsePatch } from '@/lib/contribute/patch';
import { attemptPath } from '@/lib/contribute/sessions';
import { loadAttemptLesson, loadLearnOpen } from '@/lib/learn/learn.data';
import type { LearnAttemptLesson, LessonStep } from '@/lib/learn/learn.types';
import { MY_LESSONS_PATH } from '@/lib/learn/learn-path';
import { subjectLineOf } from '@/lib/learn/lesson-format';

const Text = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

const WHAT_NEXT: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: Terminal,
    title: 'The agent writes the fix and the lesson',
    text: 'In your terminal. It also writes the questions; we check them before you see any.',
  },
  {
    Icon: GraduationCap,
    title: 'You take a 10-minute lesson',
    text: 'A few short steps with a diagram and one question each. A wrong answer costs nothing: you get another question.',
  },
  {
    Icon: GitPullRequest,
    title: 'You approve the pull request',
    text: 'It opens in your name and says it was made with GitRanks Learn.',
  },
];

/** While the agent works: what happens next, and what it did so far. */
function Waiting({ attempt, lesson }: { attempt: ContributeAttemptDetail; lesson: LearnAttemptLesson }) {
  const rewriting = lesson.stage === 'AGENT_REWRITING';
  return (
    <div className={LESSON_GRID}>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Your lesson</h2>
          <WrittenFor writtenFor={lesson.head?.writtenFor} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <Box state={lesson.stage}>
          <h2 className={HEADING.card}>
            {rewriting ? 'Your agent is working on what you sent back' : 'Your agent is fixing this issue'}
          </h2>
          <Text>
            {rewriting
              ? 'It writes a new fix or a better lesson. When both pass our checks, the lesson opens here again, with the steps you passed kept where they did not change.'
              : 'Nothing to do here yet. When the fix passes our checks, your lesson opens on this page. We also email you.'}
          </Text>
        </Box>
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
          <h2 className={HEADING.card}>What happens next</h2>
          <ol className="flex flex-col gap-3">
            {WHAT_NEXT.map(({ Icon, title, text }) => (
              <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <h3 className="font-semibold">{title}</h3>
                  <Text>{text}</Text>
                </div>
              </li>
            ))}
          </ol>
        </section>
        <TimelinePanel attempt={attempt} />
      </div>
    </div>
  );
}

/** The attempt's details below the lesson, a tab each: the change, its checks, its activity, and the lesson to read again. */
function Details({ attempt, steps }: { attempt: ContributeAttemptDetail; steps: readonly LessonStep[] }) {
  const files = parsePatch(attempt.patch).files.length;
  const checks = attempt.checksPassed === true ? '✓' : attempt.checksPassed === false ? '✗' : undefined;
  const tabs: SessionTab[] = [
    {
      value: 'changes',
      label: 'Changes',
      badge: files ? `${files} ${files === 1 ? 'file' : 'files'}` : undefined,
      content: <DiffViewer patch={attempt.patch} />,
    },
    {
      value: 'checks',
      label: 'Checks',
      badge: checks,
      content: (
        <>
          <ChecksPanel attempt={attempt} />
          <ReadinessPanel attempt={attempt} />
        </>
      ),
    },
    {
      value: 'activity',
      label: 'Activity',
      content: (
        <>
          <CostPanel attempt={attempt} />
          <TimelinePanel attempt={attempt} />
          <YourNotePanel attempt={attempt} />
        </>
      ),
    },
    ...(steps.length
      ? [
          {
            value: 'lesson',
            label: 'Lesson',
            badge: `${steps.length} steps`,
            content: steps.map((step, index) => (
              <StepArticle key={step.id} step={step} index={index} count={steps.length} copy="tab-" />
            )),
          },
        ]
      : []),
  ];
  return <SessionTabs tabs={tabs} defaultValue="changes" label="This lesson's attempt" />;
}

/** What the page adds under the lesson at its stage: the send-back, the pull request's form, the share card. */
function paneOf(view: ContributeView, attempt: ContributeAttemptDetail, lesson: LearnAttemptLesson): ReactNode {
  const steps = lesson.steps ?? [];
  const inReview = attempt.state === 'REVIEW';
  const sendBack =
    inReview && isOwnAgent(attempt) ? (
      <SendBackForm attemptId={attempt.attemptId} left={attempt.sendBacksLeft ?? 0} />
    ) : null;
  const pr = lesson.head?.subject.pr ?? attempt.pullRequest?.number ?? null;

  switch (lesson.stage) {
    case 'BLOCKED':
      return sendBack;
    case 'READY_TO_APPROVE':
      return (
        <>
          <section className="flex flex-col gap-2 rounded-xl border bg-card p-4.5">
            <h2 className={HEADING.block}>This lesson goes public when the pull request opens</h2>
            <Text>
              The pull request links to your result, so the maintainer can see what you learned. Anyone with the link
              can then take the lesson. You can take it down at any time.
            </Text>
          </section>
          {inReview ? <PrForm {...prFormPropsOf(view, attempt)} /> : null}
          {sendBack}
          <Details attempt={attempt} steps={steps} />
        </>
      );
    case 'PR_OPEN': {
      const visibility = lesson.visibility;
      return (
        <>
          {visibility === 'REMOVED' ? (
            <Box state="LEARN_REMOVED" tone="muted">
              <h2 className={HEADING.card}>You took this lesson down</h2>
              <Text>Both its links say it was removed by its author. The pull request stays as it is on GitHub.</Text>
            </Box>
          ) : visibility === 'HIDDEN' ? (
            <Box state="LEARN_HIDDEN" tone="muted">
              <h2 className={HEADING.card}>This lesson is not available</h2>
              <Text>We hid it. Its links say it is not available. The pull request stays as it is on GitHub.</Text>
            </Box>
          ) : (
            <>
              <Box state="LEARN_PR_OPEN">
                <h2 className={HEADING.card}>
                  {pr ? `Pull request #${pr} is open, and your lesson is public` : 'Your pull request is open'}
                </h2>
                <Text>
                  {visibility === 'HELD'
                    ? 'The lesson page is paused while we read reports on its questions. Your result, which the pull request links to, stays up.'
                    : 'The pull request links to your result. Anyone with the lesson link can take it.'}
                </Text>
              </Box>
              {lesson.head ? (
                <LessonShare
                  slug={lesson.head.slug}
                  shareUrl={lesson.shareUrl}
                  resultUrl={lesson.resultUrl}
                  counts={lesson.counts}
                />
              ) : null}
            </>
          )}
          <Details attempt={attempt} steps={steps} />
        </>
      );
    }
    case 'HAND_PR':
      return (
        <>
          <Box state="LEARN_HAND_PR" tone="muted">
            <h2 className={HEADING.card}>You opened the pull request yourself</h2>
            <Text>
              It is yours alone: it carries no GitRanks Learn footer, and the lesson stays private. You can still read
              the lesson below.
            </Text>
          </Box>
          <Details attempt={attempt} steps={steps} />
        </>
      );
    default:
      return null;
  }
}

/**
 * A Learn attempt's page (`/learn/attempts/<id>`): the issue, where the user is (the agent's fix, the lesson, the
 * approval), and the stage's own part: what happens next while the agent works, the lesson and its questions, the
 * summary and the pull request's form once passed, the share card once the pull request is open.
 */
export function LearnAttemptScreen({
  view,
  attempt,
  lesson,
  start,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail;
  lesson: LearnAttemptLesson;
  /** The catalogue's boards: a flow drawn part-way. */
  start?: LessonFlowStart;
}) {
  const subject = subjectLineOf(lesson.head, { repo: attempt.nameWithOwner, number: attempt.number });
  const title = attempt.title ?? lesson.head?.subject.issueTitle ?? lesson.head?.title ?? `Issue #${attempt.number}`;
  const waiting = lesson.stage === 'AGENT_WORKING' || lesson.stage === 'AGENT_REWRITING';

  let content: ReactNode;
  if (waiting) {
    content = <Waiting attempt={attempt} lesson={lesson} />;
  } else if (lesson.stage === 'ENDED') {
    content = (
      <>
        <Box state="LEARN_ENDED" tone="muted">
          <h2 className={HEADING.card}>This attempt ended</h2>
          <Text>
            {attempt.endDetail?.trim() ||
              'No pull request opens from it, and its lesson stays private. Your agent can pick another issue.'}
          </Text>
        </Box>
        <Details attempt={attempt} steps={[]} />
      </>
    );
  } else {
    content = (
      <LessonFlow
        // A new stage from the API starts the flow afresh: the passed lesson's summary, the pull request's form.
        key={lesson.stage}
        attemptId={attempt.attemptId}
        stage={lesson.stage}
        head={lesson.head}
        steps={lesson.steps ?? []}
        run={lesson.run}
        pane={paneOf(view, attempt, lesson)}
        start={start}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5" data-learn-attempt={attempt.attemptId} data-stage={lesson.stage}>
      <header className="flex flex-col gap-2">
        <Link href={MY_LESSONS_PATH} prefetch={false} className="self-start text-sm font-semibold text-link">
          ← My lessons
        </Link>
        {subject ? (
          <span className="flex flex-wrap items-center gap-2.5 font-mono text-sm text-muted-foreground">
            <a href={subject.href} target="_blank" rel="noreferrer" className="hover:underline">
              {subject.text} ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </span>
        ) : null}
        <h1 className={HEADING.page}>{title}</h1>
      </header>
      <StageStrip stage={lesson.stage} />
      {content}
    </div>
  );
}

/**
 * The page's reads: Learn open to the viewer, their attempt, and its lesson. Anything else is a 404; a Fix attempt goes
 * to its Contribute page.
 */
export async function LearnAttemptView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await loadLearnOpen())) notFound();
  const [view, attempt, lesson] = await Promise.all([loadContribute(), loadAttempt(id), loadAttemptLesson(id)]);
  if (!view || !attempt) notFound();
  if (attempt.mode === 'FIX' || !lesson) {
    if (attempt.mode === 'FIX') redirect(attemptPath(attempt.attemptId));
    notFound();
  }
  return <LearnAttemptScreen view={view} attempt={attempt} lesson={lesson} />;
}
