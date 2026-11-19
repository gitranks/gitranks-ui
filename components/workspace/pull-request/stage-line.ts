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

export function stageLineOf(attempt: StageInput, now = new Date()): StageLine | null {
  if (attempt.pullRequest) return null;
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
