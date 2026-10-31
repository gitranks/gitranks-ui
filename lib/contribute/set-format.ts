import type {
  ContributeFeedbackContext,
  ContributeFeedbackTopic,
  ContributeIssue,
  ContributeSet,
  ContributeSetAddResult,
  ContributeSetFallback,
  ContributeSetList,
  ContributeSetListMode,
  ContributeSetMode,
  ContributeSetReason,
  ContributeSetRepo,
  ContributeSetRepoStatus,
} from './contribute.types';

/** The longest add input: a GitHub link to a repo. */
export const ADD_INPUT_MAX = 200;
/** The longest feedback message, when the API does not say. */
export const FEEDBACK_MAX = 2000;

/** The three modes, in the order the page offers them. */
export const MODES: { mode: ContributeSetMode; title: string; text: string }[] = [
  { mode: 'STACK', title: 'Support my stack', text: 'Issues in the libraries your repos depend on.' },
  { mode: 'REPOS', title: 'Support these repos', text: 'Issues from repos, users and orgs you choose.' },
  { mode: 'ALL', title: 'All issues', text: 'The best issues across ~300 projects we picked.' },
];

export const modeTitleOf = (mode: ContributeSetMode) => MODES.find((entry) => entry.mode === mode)?.title ?? mode;

/** The list a mode is edited through. */
export const LIST_OF: Record<ContributeSetListMode, ContributeSetList> = { STACK: 'SOURCES', REPOS: 'REPOS' };

export const FALLBACKS: { fallback: ContributeSetFallback; label: string }[] = [
  { fallback: 'SET_ONLY', label: 'Wait for new issues' },
  { fallback: 'THEN_ALL', label: 'Work on all issues meanwhile' },
];

/** The rules a repo is read against: the repos we work on, or the repos whose dependencies make a stack. */
export type SetRules = 'work' | 'source';

/** The rules a list's repos are read against. */
export const rulesOf = (list: ContributeSetList): SetRules => (list === 'SOURCES' ? 'source' : 'work');

const REASONS: Record<ContributeSetReason, string> = {
  PRIVATE: 'Private repo',
  DELETED: 'No longer on GitHub',
  FORK: 'A fork',
  ARCHIVED: 'Archived',
  ISSUES_DISABLED: 'Issues are off',
  PUSHED: 'No commits in 90 days',
  LICENSE: 'No open-source license',
  LANGUAGE: 'Language not supported yet',
  OUTSIDE_MERGES: 'No outside PR merged in 90 days',
  OPTED_OUT: 'Maintainers asked us not to send PRs',
  AI_BAN: 'Maintainers asked us not to send PRs',
  CONTRIBUTE_OFF: 'Maintainers asked us not to send PRs',
  NO_MANIFEST: 'No dependency file we can read',
};

/** A reason in plain words, as the rules panel says it. */
export const reasonText = (reason: ContributeSetReason, rules: SetRules = 'work') =>
  reason === 'PUSHED' && rules === 'source' ? 'No commits in 12 months' : (REASONS[reason] ?? 'Did not pass the rules');

/** Reasons in plain words, each said once. */
export const reasonsText = (reasons: ContributeSetReason[], rules: SetRules = 'work') =>
  [...new Set(reasons.map((reason) => reasonText(reason, rules)))].join(', ');

const lowerFirst = (text: string) => (text ? text[0].toLowerCase() + text.slice(1) : text);

/** The rules, one line each, as the "How we pick repos" panel lists them. */
export const WORK_RULES = [
  'Public, not a fork, not archived, issues on',
  'An open-source license (OSI)',
  'A commit in the last 90 days',
  'At least one PR from outside the team merged in 90 days',
  'JavaScript/TypeScript, Python, Go, Rust, Java, PHP or Ruby',
  "Maintainers haven't asked us not to send PRs",
];
export const SOURCE_RULES = [
  'Public, not a fork, not archived',
  'A commit in the last 12 months',
  'A dependency file GitHub can read',
];

/** A repo's status on a list, as its pill says it. */
export function statusOf(
  repo: Pick<ContributeSetRepo, 'status' | 'reasons'>,
  rules: SetRules,
): { label: string; tone: 'green' | 'amber' | 'red' | 'neutral' } {
  const statuses: Record<
    ContributeSetRepoStatus,
    () => { label: string; tone: 'green' | 'amber' | 'red' | 'neutral' }
  > = {
    CHECKING: () => ({ label: rules === 'source' ? 'Reading…' : 'Reading issues…', tone: 'amber' }),
    ACTIVE: () => ({ label: rules === 'source' ? 'Read' : 'Active', tone: 'green' }),
    FAILED: () => ({
      label: repo.reasons.length ? `Didn't pass: ${lowerFirst(reasonsText(repo.reasons, rules))}` : "Didn't pass",
      tone: 'red',
    }),
    UNSUPPORTED: () => ({ label: 'Language not supported yet · not counted', tone: 'neutral' }),
  };
  return (statuses[repo.status] ?? statuses.ACTIVE)();
}

/** A group of a list's rows: the repos one add brought in. */
export type ViaGroup = { key: string; label: string; repos: ContributeSetRepo[]; addedAt: string };

/**
 * A list's repos by how they got there: "@me" first, then each user or org, the latest added first, then the repos
 * added one by one. Each group keeps the list's order.
 */
export function viaGroupsOf(repos: ContributeSetRepo[]): ViaGroup[] {
  const groups = new Map<string, ViaGroup>();
  for (const repo of repos) {
    const { kind, login } = repo.via;
    const key = kind === 'OWNER' ? `owner:${(login ?? '').toLowerCase()}` : kind;
    const label = kind === 'ME' ? '@me' : kind === 'OWNER' ? login || 'A user or org' : 'Single repos';
    const group = groups.get(key) ?? { key, label, repos: [], addedAt: repo.addedAt };
    group.repos.push(repo);
    if (repo.addedAt > group.addedAt) group.addedAt = repo.addedAt;
    groups.set(key, group);
  }
  const rank = (key: string) => (key === 'ME' ? 0 : key === 'REPO' ? 2 : 1);
  return [...groups.values()].sort(
    (a, b) => rank(a.key) - rank(b.key) || (b.addedAt > a.addedAt ? 1 : b.addedAt < a.addedAt ? -1 : 0),
  );
}

/** The list a mode edits, as the page reads it. */
export function listOf(set: ContributeSet, mode: ContributeSetListMode) {
  return mode === 'STACK'
    ? { list: 'SOURCES' as const, repos: set.stack.sources, count: set.stack.count, cap: set.limits.sources }
    : { list: 'REPOS' as const, repos: set.repos.repos, count: set.repos.count, cap: set.limits.repos };
}

/** The libraries that count: every target but the ones in a language not supported yet. */
export const countedTargetsOf = (set: ContributeSet) =>
  (set.stack.resolve?.targets ?? []).filter(({ status }) => status !== 'UNSUPPORTED');

/** How many repos a mode works on now: the libraries of the stack, or the repos list's count. */
export const setSizeOf = (set: ContributeSet, mode: ContributeSetListMode) =>
  mode === 'STACK' ? countedTargetsOf(set).length : set.repos.count;

/** The repos a mode works on now, for the counts the Issues page gives. */
export const setReposOf = (set: ContributeSet, mode: ContributeSetListMode): ContributeSetRepo[] =>
  mode === 'STACK' ? countedTargetsOf(set) : set.repos.repos.filter(({ status }) => status !== 'UNSUPPORTED');

export const plural = (count: number, one: string, many = `${one}s`) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/** The mode chip on the Issues page: "Supporting your stack · 50 libraries"; null in the "All issues" mode. */
export function modeChipOf(set: ContributeSet): { title: string; detail: string } | null {
  if (set.mode === 'ALL') return null;
  const only = (set.mode === 'STACK' ? set.stack.fallback : set.repos.fallback) === 'SET_ONLY';
  if (set.mode === 'STACK') {
    const libraries = plural(setSizeOf(set, 'STACK'), 'library', 'libraries');
    return { title: 'Supporting your stack', detail: only ? `${libraries} · only these` : libraries };
  }
  return { title: `Supporting ${plural(set.repos.count, 'repo')}`, detail: only ? 'only these' : 'then all issues' };
}

/** Each mode's line in the Issues page's switcher. */
export function modeSummaryOf(set: ContributeSet, mode: ContributeSetMode): string {
  if (mode === 'STACK') {
    return set.stack.count
      ? `${plural(setSizeOf(set, 'STACK'), 'library', 'libraries')} from ${plural(set.stack.count, 'repo')}`
      : 'No repos added yet';
  }
  if (mode === 'REPOS') return set.repos.count ? `${plural(set.repos.count, 'repo')} saved` : 'No repos added yet';
  return '~300 projects we picked';
}

/** What an add was asked for, as the notice names it: "vercel", "your repos", or one repo. */
export const addSubjectOf = (input: string) => (input.trim() === '@me' ? 'your repos' : input.trim());

/** Whether an add named one repo rather than a user or an org. */
const isRepoInput = (input: string) => /\//.test(input.trim()) && input.trim() !== '@me';

/** The add's answer in plain words, for the notice under the input. */
export function addNoticeOf(
  input: string,
  result: Pick<ContributeSetAddResult, 'added' | 'passed' | 'considered' | 'full' | 'skipped'>,
  list: { count: number; cap: number; rules: SetRules },
): { tone: 'positive' | 'warn' | 'neutral'; title: string; details: string[] } {
  const subject = addSubjectOf(input);
  const { added, passed, considered, full, skipped } = result;
  const failedTotal = skipped.failed.reduce((sum, { count }) => sum + count, 0);
  const unsupported = skipped.unsupported.length;
  const reasons = skipped.failed
    .map(({ reason, count }) => `${lowerFirst(reasonText(reason, list.rules))}: ${count.toLocaleString('en-US')}`)
    .join(', ');

  if (isRepoInput(input) && considered <= 1) {
    const repo = added[0]?.nameWithOwner ?? skipped.unsupported[0]?.nameWithOwner ?? subject;
    if (added.length) return { tone: 'positive', title: `Added ${repo}.`, details: [] };
    if (unsupported) {
      return {
        tone: 'neutral',
        title: `Added ${repo}, greyed out.`,
        details: ["Its language isn't supported yet, so it doesn't count toward your list."],
      };
    }
    if (skipped.duplicate) return { tone: 'neutral', title: `${repo} is already on your list.`, details: [] };
    if (skipped.ignored) {
      return {
        tone: 'neutral',
        title: `${repo} is on your ignored repos.`,
        details: ['Unignore it first, then add it again.'],
      };
    }
    if (full) {
      return {
        tone: 'warn',
        title: `${repo} didn't fit: your list is full (${list.count} / ${list.cap}).`,
        details: ['Remove a repo below, then add it again.'],
      };
    }
    if (skipped.failed.length) {
      return {
        tone: 'warn',
        title: `${repo} wasn't added: it didn't pass the rules.`,
        details: [`${[...new Set(skipped.failed.map(({ reason }) => reasonText(reason, list.rules)))].join(', ')}.`],
      };
    }
    return { tone: 'neutral', title: `Nothing was added from ${repo}.`, details: [] };
  }

  const me = input.trim() === '@me';
  const leftOut = Math.max(0, passed - added.length);
  const count = (value: number) => value.toLocaleString('en-US');
  const addedTitle = me
    ? passed > added.length
      ? `Added ${count(added.length)} of ${count(passed)} of your repos.`
      : added.length === 1
        ? 'Added one of your repos.'
        : `Added ${count(added.length)} of your repos.`
    : passed > added.length
      ? `Added ${count(added.length)} of ${count(passed)} repos from ${subject}.`
      : `Added ${plural(added.length, 'repo')} from ${subject}.`;
  const title = !added.length
    ? full
      ? `Nothing added from ${subject}: your list is full (${list.count} / ${list.cap}).`
      : `Nothing new to add from ${subject}.`
    : addedTitle;
  const fullLine =
    full && added.length
      ? `Your list is full (${list.count} / ${list.cap}), so the other ${plural(leftOut, 'repo')} that passed didn't fit.`
      : '';

  const parts = [
    `${count(passed)} passed`,
    failedTotal ? `${count(failedTotal)} didn't pass the rules${reasons ? ` (${reasons})` : ''}` : '',
    unsupported ? `${count(unsupported)} ${unsupported === 1 ? 'is' : 'are'} in languages not supported yet` : '',
    skipped.duplicate ? `${count(skipped.duplicate)} ${skipped.duplicate === 1 ? 'was' : 'were'} already listed` : '',
    skipped.ignored ? `${count(skipped.ignored)} ${skipped.ignored === 1 ? 'is' : 'are'} on your ignored repos` : '',
  ].filter(Boolean);
  const owner = me ? 'your' : `${subject}'s`;
  const from =
    considered >= 100
      ? `From ${owner} ${count(considered)} most-starred repos`
      : `From ${owner} ${plural(considered, 'repo')}`;
  const details = [
    ...(fullLine ? [fullLine] : []),
    `${from}: ${parts.join(', ')}.`,
    ...(full
      ? [
          `Remove repos below, then add ${me ? '@me' : subject} again to fill the space with ${me ? 'your' : 'its'} next most popular repos.`,
        ]
      : []),
  ];
  return { tone: full ? 'warn' : added.length ? 'positive' : 'neutral', title, details };
}

/** The feedback dialog's topics. */
export const FEEDBACK_TOPICS: { topic: ContributeFeedbackTopic; label: string }[] = [
  { topic: 'GATES', label: 'The rules' },
  { topic: 'MODES', label: 'Modes and lists' },
  { topic: 'OTHER', label: 'Something else' },
];

/** The "Sent along" line of the feedback dialog. */
export function feedbackContextLine(context: ContributeFeedbackContext, rules: SetRules = 'work'): string {
  return [
    context.mode ? `Mode: ${modeTitleOf(context.mode)}` : '',
    context.repo ? `Repo: ${context.repo}` : '',
    context.reasons?.length ? `Didn't pass: ${reasonsText(context.reasons, rules)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Why a feedback message cannot be sent yet; null when it can. */
export function feedbackProblemOf(text: string, maxChars: number): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Write a few words first.';
  if (trimmed.length > maxChars) return `Keep it to ${maxChars.toLocaleString('en-US')} characters at most.`;
  return null;
}

/**
 * The feed split by tier: the user's own list first, then the other issues. Without tiers (or in the "All issues"
 * mode) it is one list, as before.
 */
export function tiersOf(
  items: ContributeIssue[],
  mode: ContributeSetMode | undefined,
): { set: ContributeIssue[]; other: ContributeIssue[] } | null {
  if (!mode || mode === 'ALL' || !items.some(({ tier }) => typeof tier === 'number')) return null;
  return {
    set: items.filter(({ tier }) => tier !== 1),
    other: items.filter(({ tier }) => tier === 1),
  };
}
