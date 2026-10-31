import type {
  ContributeCredential,
  ContributeGrant,
  ContributeIssueSize,
  ContributeOwnAgent,
  ContributePreferences,
  ContributeSet,
  ContributeSettings,
} from './contribute.types';
import { EFFORTS, KINDS, LANGUAGES, MODELS, maskedKey, ordinalDay, PACES, relativeLabel, SIZES, usd } from './format';
import { modeSummaryOf, modeTitleOf, plural } from './set-format';

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

/** Languages named before "+N". */
const LANGUAGES_SHOWN = 3;

/** "Support my stack · 50 libraries from 4 repos". */
export const workSummaryOf = (set: ContributeSet) => `${modeTitleOf(set.mode)} · ${modeSummaryOf(set, set.mode)}`;

/** "TypeScript, Go · Bugs, Docs · Up to medium"; an empty list filters nothing, and says so. */
export function preferencesSummaryOf(preferences: ContributePreferences | null): string {
  const languages = preferences?.languages ?? [];
  const kinds = preferences?.kinds ?? [];
  const named = languages.slice(0, LANGUAGES_SHOWN).map((language) => LANGUAGES[language]);
  const more = languages.length - named.length;
  return [
    languages.length ? `${named.join(', ')}${more > 0 ? ` +${more}` : ''}` : 'Every language',
    kinds.length ? kinds.map((kind) => KINDS[kind]).join(', ') : 'every kind of issue',
    sizeLabelOf(preferences?.maxSize ?? null).toLowerCase(),
  ].join(' · ');
}

/** "$100 a cycle · Even, then a final sweep · renews on the 1st". */
export const budgetSummaryOf = (settings: ContributeSettings) =>
  `${usd(settings.cycleCapUsd)} a cycle · ${PACES[settings.pace].title} · renews on ${ordinalDay(settings.renewalDay)}`;

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
  if (!tokens.length) return 'No token yet';
  const used = tokens
    .map(({ lastUsedAt }) => lastUsedAt)
    .filter((at): at is string => !!at)
    .sort()
    .at(-1);
  return `${plural(tokens.length, 'token')} · ${used ? `last used ${relativeLabel(used, now)}` : 'never used'}`;
}
