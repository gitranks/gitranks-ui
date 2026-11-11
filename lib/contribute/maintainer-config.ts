import type { ContributeConfigKey, ContributeMaintainerFacts } from './contribute.types';

/** The file maintainers set their rules in. */
export const CONFIG_FILE = '.github/gitranks.yml';

/** The badge's Markdown as a README carries it: the repo's badge, linking to this page. Always the public site's. */
export const contributeBadgeMarkdown = (nameWithOwner: string) =>
  `[![GitRanks Contribute](https://gitranks.com/badge/repo/${nameWithOwner}/contribute.svg)](https://gitranks.com/contribute/maintainers?utm_source=badge&utm_medium=readme)`;

/** Where the badge's Markdown points when the page does not know the visitor's repo. */
export const BADGE_EXAMPLE_REPO = 'your-org/your-repo';

/** A line of the example file: a comment above it, then `key: value`. */
export type ConfigExampleLine = { key: string; value: string; comment?: string };

/** The example's value for each key the page knows a good one for; others fall back to their kind's. */
const EXAMPLES: Record<string, Omit<ConfigExampleLine, 'key'>> = {
  contribute: { value: 'on', comment: 'off keeps GitRanks Contribute out' },
  autopilot: { value: 'off', comment: 'a person submits every PR' },
  beginner_issues: { value: 'no', comment: 'good first issues stay with people' },
  max_open_prs: { value: '1' },
  max_changed_lines: { value: '300' },
  max_files: { value: '20' },
  min_account_age_years: { value: '6', comment: 'GitHub accounts 6+ years old' },
  min_rank: { value: 'master', comment: 'GitRanks Master and above' },
  contact: { value: 'maintainers@example.org' },
};

const KIND_VALUES: Record<string, string> = {
  onOff: 'on',
  yesNo: 'yes',
  allowedOff: 'allowed',
  tier: 'pro',
  contact: 'maintainers@example.org',
};

function exampleOf(key: ContributeConfigKey): ConfigExampleLine {
  const known = EXAMPLES[key.key];
  if (key.kind === 'int') {
    const wanted = Number(known?.value ?? key.min ?? 1);
    const value = Math.min(key.max ?? wanted, Math.max(key.min ?? wanted, wanted));
    return { key: key.key, value: String(value), ...(known?.comment ? { comment: known.comment } : {}) };
  }
  return { key: key.key, ...(known ?? { value: KIND_VALUES[key.kind] ?? 'on' }) };
}

/** The keys Contribute enforces now: the only ones the page shows, never how many there are. */
export const liveKeysOf = (facts: Pick<ContributeMaintainerFacts, 'configKeys'> | null): ContributeConfigKey[] =>
  facts?.configKeys.filter(({ live }) => live) ?? [];

/**
 * The example file the page shows: the live keys alone, with a value of the right kind. `contribute` has its own
 * line under "Rather we stay away?", so it shows here only when no other key is live.
 */
export function configExampleOf(keys: ContributeConfigKey[]): ConfigExampleLine[] {
  const rules = keys.filter(({ key }) => key !== 'contribute');
  return (rules.length ? rules : keys).map(exampleOf);
}

/** What the live keys let a maintainer do, in a line; null when only `contribute` is live. */
export function configAbilitiesOf(keys: ContributeConfigKey[]): string | null {
  const live = new Set(keys.map(({ key }) => key));
  const has = (...names: string[]) => names.some((name) => live.has(name));
  const phrases = [
    has('max_open_prs', 'max_changed_lines', 'max_files') && 'lower our limits',
    has('autopilot') && 'keep autopilot out',
    has('beginner_issues') && 'keep good first issues for people',
    has('min_account_age_years', 'min_rank') && 'choose who may open PRs',
    has('contact') && 'name a contact',
  ].filter((phrase): phrase is string => !!phrase);
  if (!phrases.length) return null;
  const line = phrases.join(', ');
  return `${line[0].toUpperCase()}${line.slice(1)}.`;
}

/** Whether a live key can also be set on the page, after signing in. */
export const anyPageKey = (keys: ContributeConfigKey[]) => keys.some(({ page }) => page);

/** `1 attempt`, `4 PRs`: a count with its word. */
export const countOf = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
