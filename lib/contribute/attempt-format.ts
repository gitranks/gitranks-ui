import type {
  ContributeAgent,
  ContributeAgentName,
  ContributeAttempt,
  ContributeAttemptCheckName,
  ContributeAttemptEndReason,
  ContributeAttemptState,
  ContributeCheckLimitView,
  ContributeChecksState,
  ContributePrState,
  ContributeReviewDecision,
  ContributeRiskLevel,
  ContributeSubmitStep,
} from './contribute.types';

export type Tone = 'neutral' | 'green' | 'violet' | 'amber' | 'red';

/** An attempt's state as a short label, and its colour. */
export const ATTEMPT_STATES: Record<ContributeAttemptState, { label: string; tone: Tone }> = {
  QUEUED: { label: 'Queued', tone: 'neutral' },
  CLAIMING: { label: 'Starting', tone: 'neutral' },
  RUNNING: { label: 'Agent working', tone: 'violet' },
  CHECKS: { label: 'Running checks', tone: 'violet' },
  REVIEW: { label: 'Ready for your review', tone: 'violet' },
  PENDING_AUTOSUBMIT: { label: 'Autopilot, about to submit', tone: 'amber' },
  SUBMITTING: { label: 'Submitting', tone: 'violet' },
  PR_OPEN: { label: 'Pull request open', tone: 'green' },
  FOLLOW_UP: { label: 'Follow-up running', tone: 'violet' },
  MERGED: { label: 'Merged', tone: 'violet' },
  CLOSED: { label: 'Closed', tone: 'red' },
  STOPPED: { label: 'Stopped', tone: 'neutral' },
  DISCARDED: { label: 'Discarded', tone: 'neutral' },
  DONE: { label: 'Pushed to the pull request', tone: 'green' },
};

/** What each state means on the timeline. */
export const EVENT_LABELS: Record<ContributeAttemptState, string> = {
  QUEUED: 'Queued',
  CLAIMING: 'Checking the issue is still free',
  RUNNING: 'The agent started',
  CHECKS: 'Running our checks',
  REVIEW: 'Waiting for your review',
  PENDING_AUTOSUBMIT: 'Autopilot will submit it unless you stop it',
  SUBMITTING: 'Submitting',
  PR_OPEN: 'Pull request opened',
  FOLLOW_UP: 'Follow-up started',
  MERGED: 'Merged',
  CLOSED: 'Closed without merging',
  STOPPED: 'Stopped',
  DISCARDED: 'Discarded',
  DONE: 'Pushed to the pull request',
};

/** States an attempt is still moving in, before a pull request. */
export const IN_PROGRESS_STATES: ContributeAttemptState[] = [
  'QUEUED',
  'CLAIMING',
  'RUNNING',
  'CHECKS',
  'PENDING_AUTOSUBMIT',
  'SUBMITTING',
  'FOLLOW_UP',
];

/** States whose page changes on its own: the page reads them again every little while. */
export const LIVE_STATES: ContributeAttemptState[] = [
  'QUEUED',
  'CLAIMING',
  'RUNNING',
  'CHECKS',
  'PENDING_AUTOSUBMIT',
  'SUBMITTING',
];

/** Why an attempt stopped or was discarded, in plain words. */
export const END_REASONS: Record<ContributeAttemptEndReason, string> = {
  CLAIM_LOST: 'Someone else took the issue first, or it was closed, before the agent started.',
  NO_GO: 'The agent read the issue and the code and decided not to go ahead.',
  BUDGET: 'It reached your limit for one attempt before the fix was done.',
  TIMEOUT: 'It ran past the two-hour limit for one attempt.',
  FAILED: 'The agent session failed before it finished.',
  CHECKS_FAILED: 'The change failed one of our checks, so it was not sent for review.',
  KEY_INVALID: 'Anthropic refused your Claude key, so the agent could not go on.',
  EXHAUSTED: 'Your credits ran out for this cycle.',
  LIMIT_REACHED: "Your workspace's spend limit was reached.",
  CANCELLED: 'It was cancelled before it finished.',
  USER: 'You discarded it.',
  REVIEW_EXPIRED: 'It waited seven days for a review, so it was let go.',
  SUBMIT_FAILED: 'The change could not be submitted as a pull request.',
  RELEASED: 'Your agent gave the issue back.',
  MCP_IDLE: 'Your agent made no call for it in 24 hours, so the issue was let go.',
  MCP_EXPIRED: 'It reached the seven days an issue can be held, so it was let go.',
};

/** The note the API puts after a no-go the agent wrote when told to wrap up at the check's limit. */
const DECIDED_AT_LIMIT = /\s*Decided at the check's (budget|time) limit\.$/;
/** The API's words for a check that reached its limit with no verdict. */
const RAN_OUT = /^No verdict(?::| before) .*the check's (?:\$[\d.]+ budget|(\d+)-minute limit) ran out/;

/**
 * A no-go at the go/no-go check's budget or time limit: `decided` when the agent wrote it on being told to wrap up,
 * else the check ran out with no verdict. From the API's `checkLimit`, else read from its detail (lists and runs).
 */
export function checkLimitOf(
  attempt: Pick<ContributeAttempt, 'endReason' | 'endDetail' | 'checkLimit'>,
): ContributeCheckLimitView | null {
  if (attempt.checkLimit !== undefined) return attempt.checkLimit;
  if (attempt.endReason !== 'NO_GO' || !attempt.endDetail) return null;
  const decided = DECIDED_AT_LIMIT.exec(attempt.endDetail);
  if (decided) return { limit: decided[1] === 'time' ? 'time' : 'budget', decided: true };
  const ranOut = RAN_OUT.exec(attempt.endDetail);
  return ranOut ? { limit: ranOut[1] ? 'time' : 'budget', decided: false } : null;
}

/** A no-go's reason without the "decided at the limit" note (the page says it apart). */
export const noGoReasonOf = (detail: string): string => detail.replace(DECIDED_AT_LIMIT, '');

/** The note under a no-go decided at the check's limit. */
export const limitNoteOf = ({ limit }: ContributeCheckLimitView): string =>
  limit === 'time'
    ? "Decided at the check's time limit, when the agent was told to wrap up."
    : "Decided at the check's budget limit, when the agent was told to wrap up.";

/** Why an attempt ended, in plain words: a check that ran out says so, the rest as `END_REASONS`. */
export function endReasonTextOf(
  attempt: Pick<ContributeAttempt, 'endReason' | 'endDetail' | 'checkLimit'>,
): string | null {
  const limit = checkLimitOf(attempt);
  if (limit && !limit.decided) {
    return limit.limit === 'time'
      ? 'Stopped: ran out of time while checking the issue.'
      : 'Stopped: ran out of budget while checking the issue.';
  }
  return attempt.endReason ? labelOf(END_REASONS, attempt.endReason) : null;
}

/** The agent names of the user's own agent, as the pull request's footer names them. */
export const AGENT_NAMES: Record<ContributeAgentName, string> = {
  CLAUDE_CODE: 'Claude Code',
  CODEX: 'Codex',
  CURSOR: 'Cursor',
  GEMINI_CLI: 'Gemini CLI',
  COPILOT: 'GitHub Copilot',
  AIDER: 'Aider',
  CLINE: 'Cline',
  OTHER: 'another AI agent',
};

/** "Claude Code (claude-opus-5-5)": the agent, and the model as it reported it. */
export const agentLabelOf = (agent: ContributeAgent | null | undefined): string | null =>
  agent ? `${AGENT_NAMES[agent.name] ?? agent.name}${agent.model ? ` (${agent.model})` : ''}` : null;

/** Each of our checks, as it reads when it passed. */
export const CHECK_LABELS: Record<ContributeAttemptCheckName, string> = {
  PATCH_PARSED: 'The patch reads as a valid change',
  NOT_EMPTY: 'The change is not empty',
  MAX_CHANGED_LINES: 'Within your limit of changed lines',
  MAX_FILES: 'Within your limit of files',
  WORKFLOW_PATHS: 'No workflow changes',
  CI_CONFIG: 'No CI config changes',
  LOCKFILES: 'No unrelated lockfile changes',
  LICENSE_FILES: 'No license file changes',
  BINARY_FILES: 'No binary files',
  SECRETS: 'No secrets in the diff',
  TESTS_PASSED: 'The tests the agent ran passed',
  TEST_TOUCHED: 'A test was added or updated',
};

/** A submission's steps in order, as the stepper shows them. */
export const SUBMIT_STEPS: { step: ContributeSubmitStep; label: string }[] = [
  { step: 'FORK', label: 'Fork' },
  { step: 'SYNC', label: 'Sync' },
  { step: 'PUSH', label: 'Push' },
  { step: 'PULL_REQUEST', label: 'Pull request' },
];

export const SUBMIT_STEP_TEXT: Record<ContributeSubmitStep, string> = {
  QUEUED: 'Approved. The submission starts in a moment.',
  WAITING_CAP: 'Waiting for tomorrow: the pull requests for today are all open.',
  FORK: 'Making your fork of the repo.',
  SYNC: 'Bringing your fork up to date with the repo.',
  PUSH: 'Pushing the change to a branch on your fork.',
  PULL_REQUEST: 'Opening the pull request.',
};

export const PR_STATES: Record<ContributePrState, { label: string; tone: Tone }> = {
  OPEN: { label: 'Open', tone: 'green' },
  MERGED: { label: 'Merged', tone: 'violet' },
  CLOSED: { label: 'Closed', tone: 'red' },
};

export const REVIEW_DECISIONS: Record<ContributeReviewDecision, string> = {
  APPROVED: 'Approved by a maintainer',
  CHANGES_REQUESTED: 'Changes requested',
  REVIEW_REQUIRED: 'Waiting for a maintainer review',
};

export const PR_CHECKS: Record<ContributeChecksState, string> = {
  SUCCESS: 'Checks passed',
  FAILURE: 'Checks failed',
  ERROR: 'Checks errored',
  PENDING: 'Checks running',
  EXPECTED: 'Checks expected',
};

export const RISKS: Record<ContributeRiskLevel, { label: string; tone: Tone }> = {
  LOW: { label: 'Low risk', tone: 'green' },
  MEDIUM: { label: 'Medium risk', tone: 'amber' },
  HIGH: { label: 'High risk', tone: 'red' },
};

/** `Oct 28, 09:12 UTC`. */
export const timeLabel = (iso: string | null | undefined) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${day}, ${time} UTC`;
};

/** A fixed code from the API (`closed_unmerged`) as words; a note of the API's own is kept as it is. */
export const detailText = (detail: string | null | undefined) => {
  const trimmed = detail?.trim();
  if (!trimmed) return '';
  return /^[a-z_]+$/.test(trimmed) ? trimmed.replaceAll('_', ' ') : trimmed;
};

/** The attempt's issue, as a heading falls back to it. */
export const attemptTitleOf = (attempt: Pick<ContributeAttempt, 'title' | 'number'>) =>
  attempt.title?.trim() || `Issue #${attempt.number}`;

/** The attempt's repo, `owner/name`, or a placeholder while the API does not know it. */
export const repoOf = (attempt: Pick<ContributeAttempt, 'nameWithOwner'>) => attempt.nameWithOwner || 'a repo';

/** The one footer line the API adds to every pull request it opens for a reviewed change, as Markdown. */
export const prFooterText = (login: string) =>
  `🤖 Made with Claude via [gitranks.com](https://gitranks.com) · reviewed by @${login}`;

/** A pull request body names the issue with a closing keyword, so GitHub closes it on merge. */
const linksIssue = (body: string, number: number) =>
  new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\b:?\\s+#${number}\\b`, 'i').test(body);

/** A line that is the footer already: the API drops it and adds its own. */
const FOOTER_LINE = /^\s*(?:<sub>)?\s*🤖 Made with .* via \[?gitranks\.com/;

/** The body to edit: the footer is the API's to add, so it is taken out of a body the agent copied it into. */
export const editableBodyOf = (body: string | null | undefined) =>
  (body ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !FOOTER_LINE.test(line))
    .join('\n')
    .trim();

/** The body as it will be sent, without the footer: `Fixes #N` first when the body does not link the issue yet. */
export function prBodyPreview(body: string, number: number): string {
  const kept = editableBodyOf(body);
  return [linksIssue(kept, number) ? '' : `Fixes #${number}`, kept].filter(Boolean).join('\n\n');
}

/** The longest title and body the API takes. */
export const PR_TITLE_MAX = 256;
export const PR_BODY_MAX = 60_000;

/** A value the UI has no words for yet (`NEW_STATE`), as words: `New state`. */
export const wordsOf = (value: string) => {
  const words = value.toLowerCase().replaceAll('_', ' ').trim();
  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : '';
};

/** `record[value]`, or the value in words when the API sends one this UI does not know yet. */
export const labelOf = (record: Record<string, string>, value: string) => record[value] ?? wordsOf(value);

/** `record[value]`, or the value in words, in the neutral colour, when the API sends one this UI does not know yet. */
export const toneLabelOf = (record: Record<string, { label: string; tone: Tone }>, value: string) =>
  record[value] ?? { label: wordsOf(value), tone: 'neutral' as const };

/** A link the API gave, kept only when it points at GitHub over HTTPS; null otherwise, which renders as plain text. */
export const githubUrlOf = (url: string | null | undefined): string | null => {
  if (!url?.startsWith('https://github.com/')) return null;
  try {
    return new URL(url).hostname === 'github.com' ? url : null;
  } catch {
    return null;
  }
};

/** Made by the user's own agent: nothing was spent on their key, so its agent stands where a cost would. */
export const isOwnAgent = (attempt: { runner?: string | null }): boolean => attempt.runner === 'MCP';

/** What an attempt cost, or, for the user's own agent, which agent made it. */
export const costOrAgentOf = (
  attempt: { runner?: string | null; agent?: ContributeAgent | null; costUsd: number },
  usd: (amount: number) => string,
): string => (isOwnAgent(attempt) ? (agentLabelOf(attempt.agent) ?? 'your own agent') : usd(attempt.costUsd));
