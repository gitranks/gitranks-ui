import type {
  ContributeConfigKey,
  ContributeMaintainerFacts,
  ContributeMaintainerRepo,
  ContributePrCard,
  ContributePrFeedbackResult,
  ContributePrNotes,
  ContributePrViewer,
} from '@/lib/contribute/contribute.types';

/** A repo the maintainers page lists for the signed-in visitor. */
export const maintainerRepo = (patch: Partial<ContributeMaintainerRepo>): ContributeMaintainerRepo => ({
  repoId: 'R_1',
  nameWithOwner: 'driftwood-js/driftwood',
  permission: 'ADMIN',
  stars: 12_345,
  isArchived: false,
  optedOut: false,
  optedOutAt: null,
  blockedContributors: [],
  stoppedPrs: [],
  ...patch,
});

const key = (patch: Partial<ContributeConfigKey> & { key: string }): ContributeConfigKey => ({
  kind: 'onOff',
  values: 'on | off',
  meaning: 'What it does',
  live: false,
  page: true,
  min: null,
  max: null,
  ...patch,
});

/** The page's facts as the API answers them today: only `contribute` enforced. */
export const maintainerFacts = (patch: Partial<ContributeMaintainerFacts> = {}): ContributeMaintainerFacts => ({
  prsPerMonth: 4,
  monthDays: 30,
  pauseStreak: 2,
  pauseDays: 60,
  attemptsPerRepo: 1,
  badgeBoost: 1.25,
  configKeys: [
    key({
      key: 'contribute',
      meaning: 'off keeps GitRanks Contribute out of the repository: no issue is picked, no pull request opened',
      live: true,
      page: false,
    }),
    key({ key: 'autopilot', kind: 'allowedOff', values: 'allowed | off', meaning: 'off: a person submits every PR' }),
    key({
      key: 'beginner_issues',
      kind: 'yesNo',
      values: 'yes | no',
      meaning: 'no: good first issues stay with people',
    }),
    key({ key: 'max_open_prs', kind: 'int', values: '1 to 10', meaning: 'PRs open at once', min: 1, max: 10 }),
    key({
      key: 'max_changed_lines',
      kind: 'int',
      values: '10 to 5000',
      meaning: 'The most lines one PR may change',
      min: 10,
      max: 5000,
    }),
    key({
      key: 'min_account_age_years',
      kind: 'int',
      values: '0 to 20',
      meaning: 'Only accounts at least this many years old',
      min: 0,
      max: 20,
    }),
    key({
      key: 'min_rank',
      kind: 'tier',
      values: 'rookie | skilled | pro | expert | master | elite | legend',
      meaning: 'Only this tier and above',
    }),
    key({ key: 'contact', kind: 'contact', values: 'an email or an https URL', meaning: 'Where to reach you' }),
  ],
  ...patch,
});

/** Every key enforced: the page's example and table as they will read. */
export const allLiveFacts = (): ContributeMaintainerFacts => {
  const facts = maintainerFacts();
  return { ...facts, configKeys: facts.configKeys.map((item) => ({ ...item, live: true })) };
};

/** One of our PRs, as its footer link names it. */
export const prCard = (patch: Partial<ContributePrCard> = {}): ContributePrCard => ({
  attemptId: '6650a1b2c3d4e5f6a7b8c9d0',
  repositoryId: 'R_1',
  nameWithOwner: 'driftwood-js/driftwood',
  number: 912,
  title: 'Keep scroll position when a nested layout re-renders',
  openedAt: '2026-10-27T10:00:00.000Z',
  contributorLogin: 'mira-dev',
  reviewed: true,
  agentPhrase: 'GitRanks Contribute powered by Claude (Opus)',
  isAuthor: false,
  ...patch,
});

/** The signed-in visitor in the PR's repo. */
export const prViewer = (patch: Partial<ContributePrViewer> = {}): ContributePrViewer => ({
  login: 'sam-w',
  role: 'MAINTAINER',
  roleConfirmed: true,
  restrictedOrg: null,
  replyTo: 'sam@driftwood.dev',
  ...patch,
});

/** A report sent, with what it applied. */
export const prReportSent = (patch: Partial<ContributePrFeedbackResult> = {}): ContributePrFeedbackResult => ({
  feedbackId: '6650a1b2c3d4e5f6a7b8c9e1',
  kind: 'REPORT',
  number: 42,
  label: 'R-0042',
  added: false,
  role: 'MAINTAINER',
  actions: [{ kind: 'STOP_PR', appliedAt: '2026-10-28T11:04:00.000Z', undoneAt: null }],
  ...patch,
});

/** The maintainers' say on the contributor's PR. */
export const prNotes = (patch: Partial<ContributePrNotes> = {}): ContributePrNotes => ({
  stopped: null,
  notes: [
    {
      feedbackId: '6650a1b2c3d4e5f6a7b8c9e2',
      login: 'sam-w',
      role: 'MAINTAINER',
      likes: ['SOLVED_WELL', 'SMALL_AND_CLEAR'],
      word: 'Clean fix, and thanks for the test. More like this welcome.',
      at: '2026-10-28T09:00:00.000Z',
      hidden: false,
    },
    {
      feedbackId: '6650a1b2c3d4e5f6a7b8c9e3',
      login: 'ana-k',
      role: 'USER',
      likes: ['GOOD_TESTS'],
      word: null,
      at: '2026-10-27T18:00:00.000Z',
      hidden: false,
    },
  ],
  ...patch,
});
