import { type CappedSetting, capHintOf, effectiveSettingOf } from './access-limits';
import type {
  ContributeCredential,
  ContributeGrant,
  ContributeIssueSize,
  ContributeLimits,
  ContributeSettings,
  ContributeSpend,
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

/** The cap's words when the access level holds a setting below what the user set: " while your account is new". */
function capWordsOf(settings: ContributeSettings, limits: ContributeLimits | null | undefined, field: CappedSetting) {
  const hint = capHintOf(limits, field);
  return hint && hint.max < settings[field] ? ` ${hint.text}` : '';
}

/**
 * Settings' Open pull requests at a time row: "Up to 8 · 3 open now", the limit that holds (a cap, or a limit set for
 * the account, included) and, when known, how many count against it now.
 */
export function openPrsSummaryOf(
  settings: ContributeSettings,
  limits: ContributeLimits | null | undefined,
  open?: number,
): string {
  const limit = effectiveSettingOf(settings, limits, 'openPrsAtATime');
  const now = typeof open === 'number' ? ` · ${open} open now` : '';
  return `Up to ${limit}${capWordsOf(settings, limits, 'openPrsAtATime')}${now}`;
}

/** Settings' Attempts at a time row: "Up to 2 issues in work at once", "1 issue in work at once while your account is new". */
export function attemptsSummaryOf(settings: ContributeSettings, limits?: ContributeLimits | null): string {
  const limit = effectiveSettingOf(settings, limits, 'attemptsAtATime');
  const words = limit === 1 ? '1 issue in work at once' : `Up to ${limit} issues in work at once`;
  return `${words}${capWordsOf(settings, limits, 'attemptsAtATime')}`;
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
