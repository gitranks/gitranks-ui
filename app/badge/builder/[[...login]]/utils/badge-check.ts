import type { BadgeCheckKind, BadgeCheckResult } from '@/types/daily-updates.types';
import { timeLeftUntil } from '@/utils/format-time-left';

/**
 * Every word of "Check my badge", in one place: the badge builder's "Get daily updates" card and the profile's sign-in
 * dialog say the same. `{readme}` is filled with the README's repository (`login/login` for a profile, the publishing
 * repository for a package), `{time}` with the time left.
 */
export const BADGE_CHECK_COPY = {
  heading: 'Get daily updates',
  intro: {
    user: 'A profile with a badge on GitHub updates every day. Add the code to your README, then check it here.',
    repo: 'A repository with a badge in its README updates every day. Add the code to its README, then check it here.',
    package:
      'A package with a GitRanks badge updates every day. The badge goes in the README of the repository that publishes it: add the code there, then check it here.',
  },
  check: 'Check my badge',
  again: 'Check again',
  checking: 'Checking…',
  found: 'Badge found in the README of {readme}. Daily updates are on.',
  foundNote: 'We look again each week. If the badge is gone, daily updates stop.',
  notFound: 'We read the README of {readme} and did not find the badge yet. Just added it? GitHub can take a minute.',
  limit: 'No more checks for now. The next one opens in {time}.',
  limitOver: 'You can check again now.',
  failed: 'We could not check the README of {readme} just now. Please try again later.',
  noRepository: 'We could not find this package’s repository, so there is no README to check.',
  /** `{readme}` for a package whose repository the page does not know by name. */
  itsRepository: 'its repository',
} as const;

const isDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** An answer of one of the six shapes, each with the field its status needs; anything else is not one. */
export function isBadgeCheckResult(value: unknown): value is BadgeCheckResult {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const answer = value as Record<string, unknown>;
  switch (answer.status) {
    case 'found':
      return isDate(answer.until);
    case 'not_found':
      return typeof answer.checksLeft === 'number' && Number.isFinite(answer.checksLeft);
    case 'limit':
      return isDate(answer.nextAt);
    case 'no_repository':
    case 'unknown':
    case 'unavailable':
      return true;
    default:
      return false;
  }
}

/** "2 checks left today." under a badge not found yet. */
export const checksLeftText = (left: number) =>
  left <= 0 ? 'No checks left today.' : left === 1 ? '1 check left today.' : `${left} checks left today.`;

/**
 * The repository whose README holds the badge: a profile's is `login/login`; a package's is the repository that
 * publishes it (`repository`, when known).
 */
export function readmeOf(kind: BadgeCheckKind, name: string, repository?: string | null): string {
  switch (kind) {
    case 'user':
      return `${name}/${name}`;
    case 'package':
      return repository || BADGE_CHECK_COPY.itsRepository;
    default:
      return name;
  }
}

/**
 * What the card shows: `idle` before a check, then one state per answer. `unknown` and `unavailable` are both
 * `failed`, with no count; `no-repository`, a package with no README to check, offers no other check.
 */
export type BadgeCheckCardState = 'idle' | 'found' | 'not-found' | 'no-repository' | 'limit' | 'failed';

export type BadgeCheckView = {
  state: BadgeCheckCardState;
  /** The main line. */
  text: string;
  /** The small print under it, if any. */
  note: string | null;
  /** The button's label; `null` when a press could not help now. */
  action: string | null;
};

/** The card's words and button for the last answer, or for no check yet; `repository`: a package's, when known. */
export function badgeCheckViewOf(
  kind: BadgeCheckKind,
  name: string,
  result: BadgeCheckResult | null,
  now: number,
  repository?: string | null,
): BadgeCheckView {
  const readme = readmeOf(kind, name, repository);
  const fill = (text: string) => text.replaceAll('{readme}', readme);

  switch (result?.status) {
    case undefined:
      return { state: 'idle', text: BADGE_CHECK_COPY.intro[kind], note: null, action: BADGE_CHECK_COPY.check };
    case 'found':
      return { state: 'found', text: fill(BADGE_CHECK_COPY.found), note: BADGE_CHECK_COPY.foundNote, action: null };
    case 'not_found':
      return {
        state: 'not-found',
        text: fill(BADGE_CHECK_COPY.notFound),
        note: checksLeftText(result.checksLeft),
        action: result.checksLeft > 0 ? BADGE_CHECK_COPY.again : null,
      };
    case 'no_repository':
      return { state: 'no-repository', text: BADGE_CHECK_COPY.noRepository, note: null, action: null };
    case 'limit':
      // Once the time has passed, the check opens again.
      return Date.parse(result.nextAt) > now
        ? {
            state: 'limit',
            text: BADGE_CHECK_COPY.limit.replace('{time}', timeLeftUntil(result.nextAt, now)),
            note: null,
            action: null,
          }
        : { state: 'limit', text: BADGE_CHECK_COPY.limitOver, note: null, action: BADGE_CHECK_COPY.again };
    case 'unknown':
    case 'unavailable':
      return { state: 'failed', text: fill(BADGE_CHECK_COPY.failed), note: null, action: BADGE_CHECK_COPY.again };
  }
}
