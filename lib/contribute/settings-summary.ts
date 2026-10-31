import type {
  ContributeCredential,
  ContributeGrant,
  ContributeIssueSize,
  ContributeOwnAgent,
  ContributePreferences,
  ContributeSet,
  ContributeSetListMode,
  ContributeSettings,
} from './contribute.types';
import { EFFORTS, KINDS, LANGUAGES, MODELS, maskedKey, ordinalDay, PACES, relativeLabel, SIZES, usd } from './format';
import { countedTargetsOf, modeSummaryOf, modeTitleOf, plural, stackPendingOf } from './set-format';

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

const fallbackOf = (set: ContributeSet, mode: ContributeSetListMode) =>
  mode === 'STACK' ? set.stack.fallback : set.repos.fallback;

/**
 * A stack with sources and no library to work on: while they are worked out, the agent works on all issues; once none
 * was found, it follows "when nothing is ready". Null once a library is read, or with no sources.
 */
export function waitingLibrariesOf(set: ContributeSet): string | null {
  if (stackPendingOf(set)) {
    return 'We work out your libraries once your repos are read. Until one is read, your agent works on all issues.';
  }
  if (!set.stack.count || countedTargetsOf(set).length) return null;
  return fallbackOf(set, 'STACK') === 'SET_ONLY'
    ? "We found no libraries we can work on in these repos, so your agent would wait. Add other repos, or pick 'Work on all issues meanwhile'."
    : 'We found no libraries we can work on in these repos. Until you add others, your agent works on all issues.';
}

/** The current list's row: its size, what is still read, and what happens when it has nothing ready. */
export function listSummaryOf(set: ContributeSet): string {
  if (set.mode === 'ALL') return modeSummaryOf(set, 'ALL');
  const only = fallbackOf(set, set.mode) === 'SET_ONLY';
  if (set.mode === 'STACK' && stackPendingOf(set)) {
    return `Working out your libraries from ${plural(set.stack.count, 'repo')} · all issues until then`;
  }
  if (set.mode === 'STACK' && set.stack.count && !countedTargetsOf(set).length) {
    return `No libraries found in ${plural(set.stack.count, 'repo')} · ${only ? 'waiting' : 'all issues meanwhile'}`;
  }
  const reading = set.mode === 'REPOS' ? set.repos.repos.filter(({ status }) => status === 'CHECKING').length : 0;
  return [
    modeSummaryOf(set, set.mode),
    set.mode === 'STACK' && set.stack.resolve?.state === 'RESOLVING' ? 'updating' : null,
    reading ? `${reading} being read` : null,
    only ? 'only these' : 'then all issues',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** What a switch away from the current mode keeps: its list, when it has one. */
export function keptListOf(set: ContributeSet): string | null {
  if (set.mode === 'STACK' && set.stack.count) {
    return `Your stack (${plural(set.stack.count, 'repo')}) stays saved: switch back any time.`;
  }
  if (set.mode === 'REPOS' && set.repos.count) {
    return `Your repos list (${plural(set.repos.count, 'repo')}) stays saved: switch back any time.`;
  }
  return null;
}

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
