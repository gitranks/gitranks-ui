import { effectiveSettingOf } from './access-limits';
import type {
  ContributeCredential,
  ContributeGrant,
  ContributeIssueSize,
  ContributeLimits,
  ContributeSettings,
  ContributeSpend,
  ContributeView,
} from './contribute.types';
import { dayLabel, EFFORTS, MODELS, maskedKey, ordinalDay, plural, SIZES, usd } from './format';

/** What we say of the Claude key's state, after its last 4. */
export const KEY_STATES: Record<ContributeCredential['state'], string> = {
  VALID: 'works',
  INVALID: 'refused by Anthropic',
  EXHAUSTED: 'credits used up',
  LIMIT_REACHED: 'workspace limit reached',
};

/** The largest size's label, "Any size" for none. */
export const sizeLabelOf = (size: ContributeIssueSize | null) =>
  size ? `Up to ${SIZES[size].toLowerCase()}` : 'Any size';

/**
 * The Budget and pacing row: "$63.40 of $200 used this cycle · renews Nov 14 · up to $5 an attempt" (before any spend,
 * "$200 a cycle · renews on the 14th").
 */
export const budgetSummaryOf = (settings: ContributeSettings, spend?: ContributeSpend | null) =>
  [
    spend
      ? `${usd(spend.cycleUsd)} of ${usd(settings.cycleCapUsd)} used this cycle`
      : `${usd(settings.cycleCapUsd)} a cycle`,
    spend ? `renews ${dayLabel(spend.cycleEnd)}` : `renews on ${ordinalDay(settings.renewalDay)}`,
    `up to ${usd(settings.attemptCapUsd)} an attempt`,
  ]
    .filter(Boolean)
    .join(' · ');

/** The Model and effort row: "Claude Sonnet 5.5, medium effort". */
export const modelSummaryOf = (settings: ContributeSettings) =>
  `${MODELS[settings.mainModel]}, ${EFFORTS[settings.effort].toLowerCase()} effort`;

/**
 * Settings' Open pull requests at a time row: "Up to 8 · 3 open now", the limit that holds (a limit set for the account
 * included) and, when known, how many count against it now.
 */
export function openPrsSummaryOf(
  settings: ContributeSettings,
  limits: ContributeLimits | null | undefined,
  open?: number,
): string {
  const limit = effectiveSettingOf(settings, limits, 'openPrsAtATime');
  const now = typeof open === 'number' ? ` · ${open} open now` : '';
  return `Up to ${limit}${now}`;
}

/** Settings' Attempts at a time row: "Up to 2 issues in work at once", "1 issue in work at once". */
export function attemptsSummaryOf(settings: ContributeSettings, limits?: ContributeLimits | null): string {
  const limit = effectiveSettingOf(settings, limits, 'attemptsAtATime');
  return limit === 1 ? '1 issue in work at once' : `Up to ${limit} issues in work at once`;
}

/** Settings' Pull request size row: "Up to 400 changed lines, 15 files · a larger change stops before review". */
export const prSizeSummaryOf = (settings: ContributeSettings) =>
  `Up to ${settings.maxChangedLines.toLocaleString('en-US')} changed lines, ${plural(settings.maxFiles, 'file')} · a larger change stops before review`;

/** Settings' DCO sign-off row. */
export const dcoSummaryOf = (settings: Pick<ContributeSettings, 'dco'>) =>
  settings.dco === 'STANDING'
    ? 'Sign off automatically when a repo requires it'
    : 'Ask me each time a repo requires it';

/** "…a1b2 · works", or "Not connected". */
export const keySummaryOf = (credential: ContributeCredential | undefined) =>
  credential ? `${maskedKey(credential.last4)} · ${KEY_STATES[credential.state]}` : 'Not connected';

/** Whether pull requests can be opened for the user, and as whom. */
export function grantSummaryOf(grant: ContributeGrant | undefined, available: boolean): string {
  if (grant?.connected) return `public_repo${grant.login ? `, as @${grant.login}` : ''}`;
  if (!available) return 'Not available yet. It is coming soon.';
  if (grant === undefined) return 'Status not available yet. Grant it, or revoke it on GitHub, any time.';
  return 'Not allowed: pull requests cannot be opened for you';
}

/** What the AI agent row says: the agent connected last and when, the hosted one, or none yet (`connected` false). */
/** The AI agent row: an agent connected, none yet, or the person's agent not read (the API did not answer it). */
export type AgentSummary = { state: 'connected' | 'none' | 'failed'; value: string };

export const AGENT_READ_FAILED = "Your agent didn't load. Reload the page to try again.";

/** `3 Nov`, in UTC. */
const connectedDayOf = (iso: string) => {
  const [month, day] = dayLabel(iso).split(' ');
  return day ? `${day} ${month}` : '';
};

export function agentSummaryOf(view: ContributeView): AgentSummary {
  const tokens = [...(view.ownAgent?.tokens ?? [])].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const [newest] = tokens;
  if (newest) {
    const others = tokens.length > 1 ? ` and ${plural(tokens.length - 1, 'other agent')}` : '';
    const day = connectedDayOf(newest.createdAt);
    return { state: 'connected', value: `${newest.name}${others}${day ? ` · connected on ${day}` : ''}` };
  }
  if (view.contributor?.credentials.some((credential) => credential.provider === 'ANTHROPIC')) {
    return { state: 'connected', value: 'The hosted agent, with your Claude key' };
  }
  // Not read: never "No agent connected yet", which may be wrong.
  if (!view.ownAgent) return { state: 'failed', value: AGENT_READ_FAILED };
  if (view.ownAgent.paths.mcp) return { state: 'connected', value: 'Your own agent · connected' };
  return { state: 'none', value: 'No agent connected yet. An agent is what fixes an issue for you.' };
}
