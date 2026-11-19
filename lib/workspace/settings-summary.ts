import { attemptsCapNoteOf } from './access-limits';
import type {
  ContributeCredential,
  ContributeGrant,
  ContributeIssueSize,
  ContributeLimits,
  ContributeOwnAgent,
  ContributeSettings,
} from './contribute.types';
import { EFFORTS, MODELS, maskedKey, ordinalDay, PACES, plural, relativeLabel, SIZES, usd } from './format';

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
 * "$100 a cycle · Even, then a final sweep · renews on the 1st", and "· 1 at a time (new-account limit)" while the
 * access level holds the attempts at a time below the setting.
 */
export const budgetSummaryOf = (settings: ContributeSettings, limits?: ContributeLimits | null) =>
  [
    `${usd(settings.cycleCapUsd)} a cycle`,
    PACES[settings.pace].title,
    `renews on ${ordinalDay(settings.renewalDay)}`,
    attemptsCapNoteOf(settings, limits),
  ]
    .filter(Boolean)
    .join(' · ');

/** "Claude Sonnet 5.5, high effort · PRs up to 400 lines, 15 files". */
export const agentSummaryOf = (settings: ContributeSettings) =>
  `${MODELS[settings.mainModel]}, ${EFFORTS[settings.effort].toLowerCase()} effort · PRs up to ${settings.maxChangedLines.toLocaleString('en-US')} lines, ${plural(settings.maxFiles, 'file')}`;

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

/** "2 tokens · last used 3 hours ago"; `undefined` while the API does not answer it yet. */
export function ownAgentSummaryOf(ownAgent: ContributeOwnAgent | undefined, now?: Date): string {
  if (ownAgent === undefined) return 'Not available yet. It is coming soon.';
  const { tokens } = ownAgent;
  if (!tokens.length) return ownAgent.signIn ? 'No agent connected yet' : 'No token yet';
  const used = tokens
    .map(({ lastUsedAt }) => lastUsedAt)
    .filter((at): at is string => !!at)
    .sort()
    .at(-1);
  // Agents that signed in are no tokens: the count says connections once there is one.
  const noun = tokens.some(({ kind }) => kind === 'OAUTH') ? 'connection' : 'token';
  return `${plural(tokens.length, noun)} · ${used ? `last used ${relativeLabel(used, now)}` : 'never used'}`;
}
