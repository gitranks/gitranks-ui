import { attemptsCapNoteOf, effectiveSettingOf } from './access-limits';
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
 * "$200 a cycle · renews on the 14th"), and "· 1 at a time (new-account limit)" while the access level holds the
 * attempts at a time below the setting.
 */
export const budgetSummaryOf = (
  settings: ContributeSettings,
  spend?: ContributeSpend | null,
  limits?: ContributeLimits | null,
) =>
  [
    spend
      ? `${usd(spend.cycleUsd)} of ${usd(settings.cycleCapUsd)} used this cycle`
      : `${usd(settings.cycleCapUsd)} a cycle`,
    spend ? `renews ${dayLabel(spend.cycleEnd)}` : `renews on ${ordinalDay(settings.renewalDay)}`,
    `up to ${usd(settings.attemptCapUsd)} an attempt`,
    attemptsCapNoteOf(settings, limits),
  ]
    .filter(Boolean)
    .join(' · ');

/** The Model and effort row: "Claude Sonnet 5.5, medium effort". */
export const modelSummaryOf = (settings: ContributeSettings) =>
  `${MODELS[settings.mainModel]}, ${EFFORTS[settings.effort].toLowerCase()} effort`;

/** The pull request limits: "PRs up to 400 lines, 15 files · 3 open at a time" (what holds now, a cap included). */
export const prLimitsSummaryOf = (settings: ContributeSettings, limits?: ContributeLimits | null) =>
  `PRs up to ${settings.maxChangedLines.toLocaleString('en-US')} lines, ${plural(settings.maxFiles, 'file')} · ${effectiveSettingOf(settings, limits, 'openPrsAtATime')} open at a time`;

/** "1 at a time", with the access level's cap when it holds below the setting. */
export const attemptsSummaryOf = (settings: ContributeSettings, limits?: ContributeLimits | null) =>
  attemptsCapNoteOf(settings, limits) ?? `${settings.attemptsAtATime} at a time`;

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
