import type {
  ContributeFeedbackContext,
  ContributeFeedbackTopic,
  ContributeIssue,
  ContributeLanguage,
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
    // Quiet: the bar under the tabs says how the reads go.
    CHECKING: () => ({ label: 'Reading', tone: 'neutral' }),
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

/** A language as short as the mode chip says it. */
const SHORT_LANGUAGES: Record<ContributeLanguage, string> = {
  JS_TS: 'JS/TS',
  PYTHON: 'Python',
  GO: 'Go',
  RUST: 'Rust',
  JAVA: 'Java',
  PHP: 'PHP',
  RUBY: 'Ruby',
};

/** The language filter as the mode chip says it: "JS/TS", "Go, Rust", "3 languages"; '' for none. */
export const languagesLabelOf = (languages: ContributeLanguage[] = []) =>
  languages.length > 2
    ? `${languages.length} languages`
    : languages.map((language) => SHORT_LANGUAGES[language]).join(', ');

/**
 * The mode chip on the Issues page: "Supporting your stack · 50 libraries · JS/TS", or a quiet "All issues" that opens
 * the switcher.
 */
export function modeChipOf(
  set: ContributeSet,
  languages: ContributeLanguage[] = [],
): { title: string; detail: string; quiet: boolean } {
  const filter = languagesLabelOf(languages);
  const withFilter = (detail: string) => [detail, filter].filter(Boolean).join(' · ');
  if (set.mode === 'ALL') return { title: 'All issues', detail: filter, quiet: true };
  const only = (set.mode === 'STACK' ? set.stack.fallback : set.repos.fallback) === 'SET_ONLY';
  if (set.mode === 'STACK') {
    const libraries = plural(setSizeOf(set, 'STACK'), 'library', 'libraries');
    return {
      title: 'Supporting your stack',
      detail: withFilter(only ? `${libraries} · only these` : libraries),
      quiet: false,
    };
  }
  return {
    title: `Supporting ${plural(set.repos.count, 'repo')}`,
    detail: withFilter(only ? 'only these' : 'then all issues'),
    quiet: false,
  };
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

/** What an add asked for: "@me", a user or org, or one repo, with the name as typed (a GitHub link read as one). */
export function addTargetOf(input: string): { kind: 'me' | 'owner' | 'repo'; name: string } {
  const trimmed = input.trim();
  if (trimmed === '@me') return { kind: 'me', name: '@me' };
  const path = trimmed
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const [owner, repo] = path.split('/');
  return repo ? { kind: 'repo', name: `${owner}/${repo}` } : { kind: 'owner', name: owner || trimmed };
}

/** Reasons merged by their words, most often first: "no outside PR merged in 90 days (38), archived (11)". */
function reasonCountsOf(failed: ContributeSetAddResult['skipped']['failed'], rules: SetRules, top = 3): string {
  const counts = new Map<string, number>();
  for (const { reason, count } of failed) {
    const words = lowerFirst(reasonText(reason, rules));
    counts.set(words, (counts.get(words) ?? 0) + count);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, top)
    .map(([words, count]) => `${words} (${count.toLocaleString('en-US')})`)
    .join(', ');
}

/** The add's answer in plain words, for the notice under the input. `listed`: the list's repo ids after the add. */
export function addNoticeOf(
  input: string,
  result: Pick<ContributeSetAddResult, 'added' | 'passed' | 'considered' | 'full' | 'skipped'>,
  list: { count: number; cap: number; rules: SetRules; listed: string[] },
): { tone: 'positive' | 'warn' | 'neutral'; title: string; details: string[] } {
  const target = addTargetOf(input);
  const { added, passed, considered, full, skipped } = result;
  const count = (value: number) => value.toLocaleString('en-US');
  const listed = new Set(list.listed);
  const greyed = skipped.unsupported.filter(({ repositoryId }) => listed.has(repositoryId));
  const unsupported = skipped.unsupported.length;
  // Each failed repo once: a repo can fail several rules, and the reasons count each one.
  const failedRepos = Math.max(0, considered - passed - skipped.ignored - skipped.duplicate - unsupported);
  const reasons = reasonCountsOf(skipped.failed, list.rules);

  if (target.kind === 'repo') {
    const repo = added[0]?.nameWithOwner ?? skipped.unsupported[0]?.nameWithOwner ?? target.name;
    if (added.length) return { tone: 'positive', title: `Added ${repo}.`, details: [] };
    if (greyed.length) {
      return {
        tone: 'neutral',
        title: `Added ${repo}, greyed out.`,
        details: ["Its language isn't supported yet, so it doesn't count toward your list."],
      };
    }
    if (unsupported) {
      return {
        tone: 'neutral',
        title: `${repo} wasn't added.`,
        details: ["Its language isn't supported yet."],
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

  const me = target.kind === 'me';
  // The owner as GitHub spells it, from what was added; else as typed.
  const owner = added[0]?.via.login ?? skipped.unsupported[0]?.via.login ?? target.name;
  const subject = me ? 'your repos' : owner;
  const leftOut = Math.max(0, passed - added.length);
  const addedTitle = me
    ? passed > added.length
      ? `Added ${count(added.length)} of ${count(passed)} of your repos.`
      : added.length === 1
        ? 'Added one of your repos.'
        : `Added ${count(added.length)} of your repos.`
    : passed > added.length
      ? `Added ${count(added.length)} of ${count(passed)} repos from ${owner}.`
      : `Added ${plural(added.length, 'repo')} from ${owner}.`;
  const title = !added.length
    ? full
      ? `Nothing added from ${subject}: your list is full (${list.count} / ${list.cap}).`
      : `Nothing new to add from ${subject}.`
    : addedTitle;
  const fullLine =
    full && added.length
      ? `Your list is full (${list.count} / ${list.cap}), so the other ${plural(leftOut, 'repo')} that passed didn't fit.`
      : '';

  const greyedLine = !unsupported
    ? ''
    : greyed.length === unsupported
      ? `${count(unsupported)} ${unsupported === 1 ? 'is' : 'are'} in languages not supported yet (shown greyed on your list, not counted)`
      : greyed.length
        ? `${count(unsupported)} ${unsupported === 1 ? 'is' : 'are'} in languages not supported yet (${count(greyed.length)} shown greyed on your list, not counted)`
        : `${count(unsupported)} ${unsupported === 1 ? 'is' : 'are'} in languages not supported yet`;
  const parts = [
    `${count(passed)} passed`,
    failedRepos ? `${count(failedRepos)} didn't pass the rules${reasons ? ` (most often: ${reasons})` : ''}` : '',
    greyedLine,
    skipped.duplicate ? `${count(skipped.duplicate)} ${skipped.duplicate === 1 ? 'was' : 'were'} already listed` : '',
    skipped.ignored ? `${count(skipped.ignored)} ${skipped.ignored === 1 ? 'is' : 'are'} on your ignored repos` : '',
  ].filter(Boolean);
  const whose = me ? 'your' : `${owner}'s`;
  const from =
    considered >= 100
      ? `From ${whose} ${count(considered)} most-starred repos`
      : `From ${whose} ${plural(considered, 'repo')}`;
  const details = [
    ...(fullLine ? [fullLine] : []),
    `${from}: ${parts.join(', ')}.`,
    ...(full
      ? [
          `Remove repos below, then add ${me ? '@me' : owner} again to fill the space with ${me ? 'your' : 'its'} next most popular repos.`,
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

/**
 * Whether the page should read itself again: a repo of the active mode's list is read for the first time, or (in
 * Stack mode) the libraries are being worked out. A list the user switched away from never counts.
 */
export function settlingOf(set: ContributeSet): boolean {
  const checking = (repos: { status: ContributeSetRepoStatus }[]) => repos.some(({ status }) => status === 'CHECKING');
  if (set.mode === 'STACK') {
    const resolve = set.stack.resolve;
    return resolve?.state === 'RESOLVING' || checking(set.stack.sources) || checking(resolve?.targets ?? []);
  }
  if (set.mode === 'REPOS') return checking(set.repos.repos);
  return false;
}
