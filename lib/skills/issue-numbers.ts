import type { SkillsIssueNumbers } from './skills.types';
import { keptShareOf } from '@/lib/workspace/masked-issue';

/*
 * The box about our list of issues on the page for someone who uses neither product: four live numbers, rounded, and
 * the sentence on how few issues make the list, worded by the same rule as everywhere else.
 */

const TWO_DIGITS = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 });

/** A number as the box rounds it: two significant digits, "51,000", "2,800", and "2.3 million" from a million. */
export function roundedOf(value: number): string {
  const rounded = Number(value.toPrecision(2));
  if (rounded >= 1_000_000) return `${TWO_DIGITS.format(rounded / 1_000_000)} million`;
  return TWO_DIGITS.format(rounded);
}

/** The box's cells, in their order: each left out while its number is not counted yet, or is zero. */
export function issueCellsOf(numbers: SkillsIssueNumbers | null): { value: string; label: string }[] {
  if (!numbers) return [];
  const cells: [number | null, string][] = [
    [numbers.repos, 'repositories watched'],
    [numbers.read, 'issues checked so far'],
    [numbers.aiReadsPerDay, 'read by AI each day'],
    [numbers.kept, 'ready to fix today'],
  ];
  return cells.flatMap(([value, label]) => (value !== null && value > 0 ? [{ value: roundedOf(value), label }] : []));
}

/**
 * How few issues make the list, from the night's numbers: "About 1 issue in 1,000 makes the list.", or with a share
 * outside that rule's band "About 0.3% of them make the list."; null before anything was read.
 */
export function keptLineOf(numbers: Pick<SkillsIssueNumbers, 'read' | 'kept'> | null): string | null {
  const share = keptShareOf(numbers);
  if (!share) return null;
  return share.startsWith('about 1 in ')
    ? `About 1 issue in ${share.slice('about 1 in '.length)} makes the list.`
    : `About ${share} of them make the list.`;
}

/** Who takes their issues from the list. */
export const LIST_USERS = 'GitRanks Contribute and GitRanks Learn take their issues from it.';

/** The box's text: why issues are hard to find, how we read them, how few are kept, and who uses the list. */
export function issuesTextOf(numbers: SkillsIssueNumbers | null): string {
  const kept = keptLineOf(numbers);
  return [
    'Good issues are hard to find: most open issues are stale, taken, unclear or already fixed.',
    'We check every issue in the repositories we watch. Rules drop most of them.',
    'Then two AI models, Jev and Claude, read each one that is left and keep only what a maintainer wants fixed.',
    ...(kept ? [kept] : []),
    LIST_USERS,
  ].join(' ');
}
