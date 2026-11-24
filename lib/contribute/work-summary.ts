import { liveTargetsOf, modeSummaryOf, readingLibrariesOf, stackPendingOf } from './set-format';
import type { ContributePreferences, ContributeSet, ContributeSetListMode } from '@/lib/workspace/contribute.types';
import { LANGUAGES, plural } from '@/lib/workspace/format';

/** Languages named before "+N". */
const LANGUAGES_SHOWN = 3;

const fallbackOf = (set: ContributeSet, mode: ContributeSetListMode) =>
  mode === 'STACK' ? set.stack.fallback : set.repos.fallback;

/**
 * A stack with sources and no library to work on: while they are worked out, the agent works on all issues; once none
 * was found, it follows "when nothing is ready". Null once a library is read, or with no sources.
 */
export function waitingLibrariesOf(set: ContributeSet, now: Date): string | null {
  if (stackPendingOf(set, now)) {
    const reading = readingLibrariesOf(set);
    return reading
      ? `We found ${plural(reading, 'library', 'libraries')} and are reading them for the first time. Until one is read, your agent works on all issues.`
      : 'We work out your libraries once your repos are read. Until one is read, your agent works on all issues.';
  }
  if (!set.stack.count || liveTargetsOf(set).length) return null;
  return fallbackOf(set, 'STACK') === 'SET_ONLY'
    ? "We found no libraries we can work on in these repos, so your agent would wait. Add other repos, or pick 'Work on all issues meanwhile'."
    : 'We found no libraries we can work on in these repos. Until you add others, your agent works on all issues.';
}

/** The current list's row: its size, what is still read, and what happens when it has nothing ready. */
export function listSummaryOf(set: ContributeSet, now: Date): string {
  if (set.mode === 'ALL') return modeSummaryOf(set, 'ALL');
  const only = fallbackOf(set, set.mode) === 'SET_ONLY';
  if (set.mode === 'STACK' && stackPendingOf(set, now)) {
    const reading = readingLibrariesOf(set);
    return reading
      ? `Reading ${plural(reading, 'library', 'libraries')} for the first time · all issues until then`
      : `Working out your libraries from ${plural(set.stack.count, 'repo')} · all issues until then`;
  }
  if (set.mode === 'STACK' && set.stack.count && !liveTargetsOf(set).length) {
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

/** "TypeScript, Go +2", or "Every language" when none is picked (none filters nothing). */
export function preferencesSummaryOf(preferences: ContributePreferences | null): string {
  const languages = preferences?.languages ?? [];
  const named = languages.slice(0, LANGUAGES_SHOWN).map((language) => LANGUAGES[language]);
  const more = languages.length - named.length;
  return languages.length ? `${named.join(', ')}${more > 0 ? ` +${more}` : ''}` : 'Every language';
}
