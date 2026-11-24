import { ArrowRight, GitPullRequest, GraduationCap, type LucideIcon, Terminal } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LearnSettingUp } from './learn-setting-up';
import { LessonShare } from './lesson-share';
import { MoveOnOnceOpen, WatchingOpen } from './opening-move-on';
import { PracticeRows } from './practice-lessons';
import { LessonFlow, type LessonFlowStart } from '@/components/learn/lesson-flow';
import { LESSON_GRID } from '@/components/learn/lesson-steps';
import { WrittenFor } from '@/components/learn/written-for';
import { Button } from '@/components/ui/button';
import { HEADING } from '@/components/workspace/primitives';
import { TimelinePanel } from '@/components/workspace/pull-request/attempt-panels';
import { CardError, DiscardAttemptButton } from '@/components/workspace/pull-request/head-actions';
import { PrForm } from '@/components/workspace/pull-request/pr-form';
import {
  LessonUnavailable,
  lessonPageOf,
  type PageParams,
  prFormPropsOf,
} from '@/components/workspace/pull-request/review-view';
import { SendBackForm } from '@/components/workspace/pull-request/send-back-form';
import { SessionActionsProvider } from '@/components/workspace/pull-request/session-actions';
import { LiveSubmit } from '@/components/workspace/pull-request/submit-stepper';
import { Box } from '@/components/workspace/status-box';
import { loadLearnOpen, loadLearnSetup, loadPracticeLessons } from '@/lib/learn/learn.data';
import type { LearnAttemptLesson, PracticeLessons } from '@/lib/learn/learn.types';
import { endedReasonOf, WAIT_PRACTICE } from '@/lib/learn/learn-home';
import { LEARN_EARLIER_PATH, LEARN_PRACTICE_PATH } from '@/lib/learn/learn-path';
import { isOwnAgent } from '@/lib/workspace/attempt-format';
import type { CommentActionsInit } from '@/lib/workspace/comment-actions';
import type { ContributeAttemptDetail, ContributeView } from '@/lib/workspace/contribute.types';
import { parsePatch } from '@/lib/workspace/patch';
import { PICK_ISSUE_PATHS } from '@/lib/workspace/paths';

/** How to give the issue back while the agent works. */
const CHANGED_YOUR_MIND =
  'Changed your mind? Ask your agent to release the issue. If your agent stops, the issue goes back by itself within 24 hours.';

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

/** While the agent works, if the learner likes: two practice lessons for their goal. Left out when there is none. */
function WhileYouWait({ practice }: { practice: PracticeLessons | undefined }) {
  const items = practice?.items.slice(0, WAIT_PRACTICE) ?? [];
  if (!items.length) return null;
  return (
    <section
      aria-labelledby="while-you-wait"
      className="flex flex-col gap-3 rounded-xl border bg-card p-5"
      data-meanwhile=""
    >
      <h2 id="while-you-wait" className={HEADING.card}>
        While you wait: a practice lesson, if you like
      </h2>
      <Text>Optional. Made for the same goal as yours, and it doesn’t touch your agent’s work.</Text>
      <PracticeRows lessons={items} />
      <Link
        href={LEARN_PRACTICE_PATH}
        prefetch={false}
        className="self-start text-sm font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
      >
        All practice lessons →
      </Link>
    </section>
  );
}

/** While the agent works: what happens next, what it did so far, and a practice lesson if the learner likes. */
function Waiting({
  attempt,
  lesson,
  practice,
}: {
  attempt: ContributeAttemptDetail;
  lesson: LearnAttemptLesson;
  practice: PracticeLessons | undefined;
}) {
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
            {rewriting ? 'Your agent is working on what you sent back' : 'Your agent is writing your lesson'}
          </h2>
          <Text>
            {rewriting
              ? 'It writes a new fix or a better lesson. When both pass our checks, the lesson opens here again, with the steps you passed kept where they did not change.'
              : 'Nothing to do here yet. When the fix passes our checks, your lesson opens on this page.'}{' '}
            Your agent tells you in the terminal too.
          </Text>
          <Text>{CHANGED_YOUR_MIND}</Text>
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
        <WhileYouWait practice={practice} />
        <TimelinePanel attempt={attempt} />
      </div>
    </div>
  );
}

/** The session's actions for a lesson's attempt in review: its submit and its Discard, nothing of a run. */
const reviewInitOf = (attempt: ContributeAttemptDetail): CommentActionsInit => ({
  session: 'first',
  prId: null,
  prNumber: null,
  attemptId: attempt.attemptId,
  runState: null,
  approvedAt: attempt.approvedAt,
  flow: false,
  checkStatus: null,
  hasCommits: !!attempt.patch?.trim(),
  drafts: [],
  threads: [],
  resolveHumans: undefined,
  blocked: new Set(),
  canStart: false,
});

/** "Read the changes →": the Pull request view, where the change and its checks are. */
function ChangesLine({ attempt, base }: { attempt: ContributeAttemptDetail; base: Route }) {
  const files = parsePatch(attempt.patch).files.length;
  return (
    <p data-changes-line="" className="text-sm text-muted-foreground">
      {files ? `The change: ${files} ${files === 1 ? 'file' : 'files'}.` : 'The change.'}{' '}
      <Link href={base} prefetch={false} className="font-semibold text-link">
        Read the changes →
      </Link>
    </p>
  );
}

/** The pull request on its way to GitHub: the stepper, or the wait for tomorrow's slot. The page moves on by itself. */
function Opening({ attempt, now }: { attempt: ContributeAttemptDetail; now?: Date }) {
  const tomorrow = attempt.submit?.step === 'WAITING_CAP';
  return (
    <Box state={tomorrow ? 'LEARN_OPENING_TOMORROW' : 'LEARN_OPENING'}>
      <h2 className={HEADING.card}>Opening your pull request…</h2>
      <Text>
        {tomorrow
          ? "It opens after 00:00 UTC: today's limit of new pull requests is reached."
          : 'This page moves on by itself. It usually takes under a minute.'}
      </Text>
      <WatchingOpen attemptId={attempt.attemptId} />
      {tomorrow ? null : (
        <LiveSubmit
          attempt={{
            attemptId: attempt.attemptId,
            state: attempt.state,
            updatedAt: attempt.updatedAt,
            submit: attempt.submit,
            pullRequest: attempt.pullRequest,
          }}
          now={now}
        />
      )}
    </Box>
  );
}

/** The share card's title by the pull request's state: the lesson stays `PR_OPEN` after a merge or a close. */
function prTitleOf(pr: number | null, state: string): string {
  const name = pr ? `Pull request #${pr}` : 'Your pull request';
  if (state === 'MERGED') return `${name} was merged, and your lesson is public`;
  if (state === 'CLOSED') return `${name} was closed without merging`;
  return `${name} is open, and your lesson is public`;
}

/** Where the learner goes next once the pull request is open: the next issue to learn from, on today's Learn. */
const NextLesson = () => (
  <Link href={LEARN_EARLIER_PATH} prefetch={false} className="self-start text-sm font-semibold text-link">
    Start the next lesson →
  </Link>
);

/**
 * What the Lesson view adds under the lesson at its stage (W1 §8.6): the send-back; once passed, the changes in one line,
 * the pull request's form and what happens after; while it opens, the stepper; once open, the share card.
 */
function paneOf(
  view: ContributeView,
  attempt: ContributeAttemptDetail,
  lesson: LearnAttemptLesson,
  base: Route,
  now?: Date,
): ReactNode {
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
      if (attempt.state === 'SUBMITTING') return <Opening attempt={attempt} now={now} />;
      return (
        <>
          <ChangesLine attempt={attempt} base={base} />
          <section className="flex flex-col gap-2 rounded-xl border bg-card p-4.5">
            <h2 className={HEADING.block}>This lesson goes public when the pull request opens</h2>
            <Text>
              The pull request links to your result, so the maintainer can see what you learned. Anyone with the link
              can then take the lesson. You can take it down at any time.
            </Text>
          </section>
          {inReview ? (
            // The submit and Discard share one pending state, as on a contribution's review card.
            <SessionActionsProvider init={reviewInitOf(attempt)}>
              <PrForm {...prFormPropsOf(view, attempt)} />
              <div className="flex flex-col items-start gap-2">
                <DiscardAttemptButton />
                <CardError sources={['submit', 'discard-attempt']} />
              </div>
            </SessionActionsProvider>
          ) : null}
          {sendBack}
        </>
      );
    case 'PR_OPEN': {
      const visibility = lesson.visibility;
      const prState = attempt.pullRequest?.state ?? 'OPEN';
      return (
        <>
          {/* A tab that watched the pull request open here goes on to it. */}
          <MoveOnOnceOpen attemptId={attempt.attemptId} to={base} />
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
              <Box state={`LEARN_PR_${prState}`}>
                <h2 className={HEADING.card}>{prTitleOf(pr, prState)}</h2>
                <Text>
                  {visibility === 'HELD'
                    ? 'The lesson page is paused while we read reports on its questions. Your result, which the pull request links to, stays up.'
                    : prState === 'CLOSED'
                      ? 'Your lesson stays public: the pull request still links to your result. You can take it down below.'
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
          <NextLesson />
        </>
      );
    }
    case 'HAND_PR':
      return (
        <Box state="LEARN_HAND_PR" tone="muted">
          <h2 className={HEADING.card}>You opened the pull request yourself</h2>
          <Text>
            It is yours alone: it carries no GitRanks Learn footer, and the lesson stays private. You can still read the
            lesson below.
          </Text>
        </Box>
      );
    default:
      return null;
  }
}

/**
 * The Lesson view of a Learn pull request (`…/lesson`, W1 §8.6), under the page's header and its two views: while the
 * agent works, what happens next; the lesson and its questions; the summary and the pull request's form once passed; the
 * stepper while it opens; the share card once it is open; why an attempt ended. The Pull request view holds the change,
 * its checks and its activity.
 */
export function LessonViewScreen({
  view,
  attempt,
  lesson,
  base,
  start,
  practice,
  now,
}: {
  view: ContributeView;
  attempt: ContributeAttemptDetail;
  lesson: LearnAttemptLesson;
  /** The pull request's page: its Pull request view. */
  base: Route;
  /** The catalogue's boards: a flow drawn part-way. */
  start?: LessonFlowStart;
  /** Practice lessons for the learner's goal, read while the agent works. */
  practice?: PracticeLessons;
  now?: Date;
}) {
  const waiting = lesson.stage === 'AGENT_WORKING' || lesson.stage === 'AGENT_REWRITING';

  let content: ReactNode;
  if (waiting) {
    content = <Waiting attempt={attempt} lesson={lesson} practice={practice} />;
  } else if (lesson.stage === 'ENDED') {
    content = (
      <Box state="LEARN_ENDED" tone="muted">
        <h2 className={HEADING.card}>This attempt ended</h2>
        <Text>{endedReasonOf(attempt.endReason)} No pull request opens from it, and its lesson stays private.</Text>
        <Button asChild className="min-h-11 self-start px-5 font-semibold max-sm:w-full">
          <Link href={PICK_ISSUE_PATHS.learn} prefetch={false}>
            Pick another issue
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </Box>
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
        pane={paneOf(view, attempt, lesson, base, now)}
        start={start}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5" data-learn-attempt={attempt.attemptId} data-stage={lesson.stage}>
      {content}
    </div>
  );
}

/**
 * The Lesson view's page: the reads, then the screen. While the agent works, practice lessons for the learner's goal;
 * never read once the lesson is there. A new account still being set up says so.
 */
export async function LessonView({ params }: { params: Promise<PageParams> }) {
  const read = await lessonPageOf(params);
  if (!read) return null;
  if (read === 'unread') return <LessonUnavailable />;
  if ((await loadLearnOpen()) && (await loadLearnSetup())) return <LearnSettingUp />;
  const waiting = read.lesson.stage === 'AGENT_WORKING' || read.lesson.stage === 'AGENT_REWRITING';
  const practice = waiting ? await loadPracticeLessons(WAIT_PRACTICE) : undefined;
  return (
    <LessonViewScreen
      view={read.view}
      attempt={read.first}
      lesson={read.lesson}
      base={read.base}
      practice={practice}
      now={new Date()}
    />
  );
}
