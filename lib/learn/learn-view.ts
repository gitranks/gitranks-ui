import type { LearnAttemptLesson, LearnStage } from './learn.types';
import { levelPhraseOf } from './learn-home';

/** The two views of a Learn pull request's page: the pull request itself, or its lesson. */
export type LearnView = 'pr' | 'lesson';

/** The stages whose page is the lesson: before the pull request, and the ends where none comes. */
const LESSON_STAGES: ReadonlySet<LearnStage> = new Set([
  'AGENT_WORKING',
  'AGENT_REWRITING',
  'WARMUP',
  'LESSON',
  'BLOCKED',
  'READY_TO_APPROVE',
  'ENDED',
]);

/**
 * Which view a link to a Learn attempt opens (W1 §8.3): the lesson while it is written, taken, fixed or passed and not
 * yet submitted, when the attempt ended (no pull request ever comes), and for a pull request opened by hand while the
 * attempt holds none; the pull request's view once it is open, or known. Lists, emails, the agent's review link and the
 * address by attempt decide by this alone. Both views are always reachable from the header.
 */
export function learnViewOf(stage: LearnStage | null | undefined, hasPullRequest: boolean): LearnView {
  if (!stage) return hasPullRequest ? 'pr' : 'lesson';
  if (stage === 'HAND_PR') return hasPullRequest ? 'pr' : 'lesson';
  return LESSON_STAGES.has(stage) ? 'lesson' : 'pr';
}

/**
 * What the person pastes in their own agent for a change on a Learn pull request: the pull request by its address, and
 * the id the agent's follow-up tool takes today, so it starts the follow-up through GitRanks; the change comes back for
 * the person to read before anything is pushed.
 */
export const learnFollowUpPromptOf = (pullRequestUrl: string, prId: string) =>
  `Continue my GitRanks pull request ${pullRequestUrl}: start the follow-up with start_follow_up (prId ${prId}), then submit the change for my review. Don't push anything yourself.`;

/** "Oct 28". */
const dayOf = (iso: string | null | undefined) => {
  const at = iso ? new Date(iso) : null;
  return at && !Number.isNaN(at.getTime())
    ? at.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : null;
};

/** "written for TypeScript, some experience": the goal and the level as the lesson was written for them. */
function writtenForOf(writtenFor: string | null | undefined): string | null {
  const text = writtenFor?.trim();
  if (!text) return null;
  const match = /^(?:learn\s+)?(.*?),\s*level\s+(.+)$/i.exec(text);
  if (!match) return `written for ${text.replace(/^learn\s+/i, '')}`;
  return `written for ${match[1]}, ${levelPhraseOf(match[2])}`;
}

/** The lesson line of the header (W1 §8.2 item 5): a pill and a few facts; null where the lesson has none to say. */
export type LessonLine = { pill: { label: string; tone: 'neutral' | 'violet' | 'green' | 'amber' }; facts: string[] };

/**
 * The lesson in one line, by its stage: being written or rewritten; the step the learner is on and whom it was written
 * for; that its questions need a fix; passed, and once the pull request is open when and whether it is public and how
 * many passed it, or that it was taken down, is not available or is paused. An ended attempt has none.
 */
export function lessonLineOf(lesson: LearnAttemptLesson): LessonLine | null {
  const steps = lesson.steps?.length ?? 0;
  const passedSteps = lesson.run?.steps.filter(({ state }) => state !== 'OPEN').length ?? 0;
  const passed = (extra: string[] = []): LessonLine => ({
    pill: { label: steps ? `Passed ${steps} of ${steps}` : 'Passed', tone: 'green' },
    facts: [dayOf(lesson.run?.passedAt), ...extra].filter((fact): fact is string => !!fact),
  });
  switch (lesson.stage) {
    case 'AGENT_WORKING':
      return { pill: { label: 'Being written', tone: 'neutral' }, facts: [] };
    case 'AGENT_REWRITING':
      return { pill: { label: 'Being rewritten', tone: 'neutral' }, facts: [] };
    case 'WARMUP':
    case 'LESSON': {
      const at = Math.min(passedSteps + 1, Math.max(steps, 1));
      return {
        pill: { label: steps ? `Step ${at} of ${steps}` : 'Ready', tone: 'violet' },
        facts: [writtenForOf(lesson.head?.writtenFor)].filter((fact): fact is string => !!fact),
      };
    }
    case 'BLOCKED':
      return { pill: { label: 'Needs a fix', tone: 'amber' }, facts: [] };
    case 'READY_TO_APPROVE':
    case 'HAND_PR':
      return passed();
    case 'PR_OPEN': {
      switch (lesson.visibility) {
        case 'REMOVED':
          return passed(['taken down']);
        case 'HIDDEN':
          return passed(['not available']);
        case 'HELD':
          return passed(['paused']);
        case 'PUBLIC': {
          const count = lesson.head?.passes ?? lesson.counts?.passes ?? 0;
          return passed(['public', ...(count ? [`${count} ${count === 1 ? 'person' : 'people'} passed it`] : [])]);
        }
        default:
          return passed();
      }
    }
    default:
      return null;
  }
}
