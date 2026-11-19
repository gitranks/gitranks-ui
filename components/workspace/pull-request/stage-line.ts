import type { LearnStage } from '@/lib/learn/learn.types';
import type { Tone } from '@/lib/workspace/attempt-format';
import { endReasonLabelOf } from '@/lib/workspace/attempt-format';
import type { ContributeAttemptDetail } from '@/lib/workspace/contribute.types';
import { timeLeftLabel } from '@/lib/workspace/format';
import { stopReasonOf } from '@/lib/workspace/session-status';

/**
 * The pull request's page's status line while no pull request exists: where the first attempt stands, in a pill and a
 * few words (W1 §8.5). One function for both sides: a Learn attempt's pull request opens after its lesson is passed.
 * Null once the pull request exists (its own line says it) and for a state this UI does not know.
 */
export type StageLine = { name: string; pill: { label: string; tone: Tone }; text: string | null };

type StageInput = Pick<
  ContributeAttemptDetail,
  | 'state'
  | 'mode'
  | 'pullRequest'
  | 'endReason'
  | 'endDetail'
  | 'checkLimit'
  | 'budgetUsd'
  | 'kind'
  | 'autosubmitAt'
  | 'submit'
>;

/** "No pull request yet: it opens when you approve", or after the lesson for a Learn attempt. */
const notYetOf = (attempt: Pick<ContributeAttemptDetail, 'mode'>) =>
  attempt.mode === 'LEARN'
    ? 'No pull request yet: it opens after you pass the lesson'
    : 'No pull request yet: it opens when you approve';

/** A sentence from a short reason: "the agent said no-go" → "The agent said no-go." */
const sentenceOf = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}${/[.!?]$/.test(text) ? '' : '.'}`;

/** A Learn attempt's line, by its lesson's stage (W1 §8.6); null where the attempt's own state says it. */
function learnLineOf(attempt: StageInput, stage: LearnStage): StageLine | null {
  const notYet = notYetOf(attempt);
  switch (stage) {
    case 'AGENT_WORKING':
    case 'AGENT_REWRITING':
      return { name: 'working', pill: { label: 'Agent working', tone: 'violet' }, text: notYet };
    case 'WARMUP':
    case 'LESSON':
    case 'BLOCKED':
      return { name: 'lesson-ready', pill: { label: 'Lesson ready', tone: 'violet' }, text: notYet };
    case 'READY_TO_APPROVE':
      if (attempt.state === 'SUBMITTING') return null;
      return attempt.submit?.lastError
        ? {
            name: 'not-opened',
            pill: { label: 'Not opened', tone: 'red' },
            text: 'The pull request did not open: see what to do below',
          }
        : {
            name: 'lesson-passed',
            pill: { label: 'Lesson passed', tone: 'green' },
            text: 'The pull request is not open yet: read it and submit it below',
          };
    case 'ENDED':
      return { name: 'ended', pill: { label: 'Ended', tone: 'neutral' }, text: null };
    case 'HAND_PR':
      return {
        name: 'hand-pr',
        pill: { label: 'Opened by hand', tone: 'neutral' },
        text: 'You opened the pull request yourself',
      };
    default:
      return null;
  }
}

/**
 * `lessonStage`: a Learn attempt's lesson stage, when it is read; its line then follows the lesson (written, taken,
 * passed, ended).
 */
export function stageLineOf(attempt: StageInput, now = new Date(), lessonStage?: LearnStage | null): StageLine | null {
  if (attempt.pullRequest) return null;
  const learn = attempt.mode === 'LEARN' && lessonStage ? learnLineOf(attempt, lessonStage) : null;
  if (learn) return learn;
  switch (attempt.state) {
    case 'QUEUED':
    case 'CLAIMING':
    case 'RUNNING':
    case 'CHECKS':
      return { name: 'working', pill: { label: 'Agent working', tone: 'violet' }, text: notYetOf(attempt) };
    case 'REVIEW':
      // A submit that came back: the card below says why and what to do.
      return attempt.submit?.lastError
        ? { name: 'not-opened', pill: { label: 'Not opened', tone: 'red' }, text: 'See what to do below' }
        : { name: 'review', pill: { label: 'Your review', tone: 'violet' }, text: notYetOf(attempt) };
    case 'PENDING_AUTOSUBMIT': {
      const left = timeLeftLabel(attempt.autosubmitAt, now);
      return {
        name: 'autopilot',
        pill: { label: 'Autopilot', tone: 'violet' },
        text: left ? `Submits in ${left}` : 'Submits soon',
      };
    }
    case 'SUBMITTING':
      return attempt.submit?.step === 'WAITING_CAP'
        ? { name: 'opening-tomorrow', pill: { label: 'Opening tomorrow', tone: 'violet' }, text: null }
        : { name: 'opening', pill: { label: 'Opening…', tone: 'violet' }, text: null };
    case 'STOPPED': {
      if (attempt.endReason === 'CLAIM_LOST') {
        return {
          name: 'claim-lost',
          pill: { label: 'Stopped', tone: 'neutral' },
          text: 'The issue changed before the agent could start (someone else took it, or it was closed).',
        };
      }
      if (attempt.endReason === 'SUBMIT_FAILED') {
        return { name: 'not-opened', pill: { label: 'Not opened', tone: 'red' }, text: 'See what to do below' };
      }
      const reason = stopReasonOf(attempt);
      const noGo = attempt.endReason === 'NO_GO';
      return {
        name: noGo ? 'no-go' : 'stopped',
        pill: noGo ? { label: 'No-go', tone: 'neutral' } : { label: 'Stopped', tone: 'neutral' },
        text: reason ? sentenceOf(reason) : null,
      };
    }
    case 'DISCARDED':
      return {
        name: 'discarded',
        pill: { label: 'Discarded', tone: 'neutral' },
        text: endReasonLabelOf(attempt) ?? null,
      };
    default:
      return null;
  }
}
