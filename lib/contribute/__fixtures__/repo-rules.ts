import type {
  ContributeIssueRepoRules,
  ContributeMaintainerConfigValue,
  ContributeMaintainerRepoRules,
  ContributeRepoRules,
  ContributeRuleSource,
} from '@/lib/contribute/contribute.types';

const REPO = 'driftwood-js/driftwood';
const file = (path: string): ContributeRuleSource => ({
  label: path,
  url: `https://github.com/${REPO}/blob/HEAD/${path}`,
});
const PAGE: ContributeRuleSource = {
  label: 'GitRanks maintainers page',
  url: 'https://gitranks.com/contribute/maintainers',
};

/** A repo's rules as "Your repos" shows them: quotes, sources, and who set the page value. */
export const maintainerRules = (patch: Partial<ContributeMaintainerRepoRules> = {}): ContributeMaintainerRepoRules => ({
  manualOnly: true,
  lines: [
    {
      kind: 'NO_AUTONOMOUS',
      text: "AI-made changes need a person's review: autopilot never submits here, the contributor reviews and submits each pull request.",
      source: file('AI_POLICY.md'),
      quote: 'Agents must not open pull requests on their own. A person reviews and submits every change.',
      setBy: null,
    },
    {
      kind: 'NO_GFI',
      text: 'No AI-assisted work on good first issues: GitRanks leaves them to newcomers.',
      source: file('AI_POLICY.md'),
      quote: 'Issues labelled good first issue are for new contributors. Please don’t use AI tools on them.',
      setBy: null,
    },
    {
      kind: 'DISCLOSURE',
      text: 'AI use is disclosed the way the repository asks: GitRanks adds it when the pull request opens.',
      source: file('AI_POLICY.md'),
      quote: 'Mark AI-assisted commits with an Assisted-by: trailer that names the tool.',
      setBy: null,
    },
    {
      kind: 'HUMAN_WORDS',
      text: "The pull request's description says why in the contributor's own words.",
      source: file('CONTRIBUTING.md'),
      quote: 'Write the pull request description yourself, and tell us why the change is needed.',
      setBy: null,
    },
    {
      kind: 'CAPS',
      text: 'At most 300 changed lines per pull request.',
      source: file('.github/gitranks.yml'),
      quote: null,
      setBy: null,
    },
    { kind: 'CAPS', text: 'At most 10 files per pull request.', source: PAGE, quote: null, setBy: 'mira-k' },
  ],
  ...patch,
});

/** The same rules on the attempt: the quotes, never who set a value, and the limits the attempt runs under. */
export const attemptRules = (patch: Partial<ContributeRepoRules> = {}): ContributeRepoRules => ({
  manualOnly: true,
  lines: maintainerRules().lines.map(({ setBy: _, ...line }) => line),
  caps: {
    lines: 300,
    files: 10,
    linesSource: '.github/gitranks.yml',
    filesSource: "a maintainer's setting on gitranks.com",
  },
  ...patch,
});

/** A repo with no rules, on the attempt: the user's own limits. */
export const attemptNoRules = (): ContributeRepoRules => ({
  manualOnly: false,
  lines: [],
  caps: { lines: 400, files: 15, linesSource: null, filesSource: null },
});

/** The same rules on an issue card: no quotes. */
export const issueRules = (patch: Partial<ContributeIssueRepoRules> = {}): ContributeIssueRepoRules => ({
  manualOnly: true,
  lines: maintainerRules().lines.map(({ kind, text, source }) => ({ kind, text, source })),
  ...patch,
});

const value = (key: string, patch: Partial<ContributeMaintainerConfigValue> = {}): ContributeMaintainerConfigValue => ({
  key,
  value: null,
  source: null,
  setBy: null,
  ignoredRaw: null,
  fileReadAt: '2026-11-03T08:40:00.000Z',
  ...patch,
});

/** Every key of the repo: lines from the file, files and the contact set here, a file value we skipped. */
export const maintainerConfig = (): ContributeMaintainerConfigValue[] => [
  value('contribute'),
  value('autopilot'),
  value('beginner_issues'),
  value('max_open_prs', { ignoredRaw: 'many' }),
  value('max_changed_lines', { value: '300', source: 'FILE' }),
  value('max_files', { value: '10', source: 'PAGE', setBy: 'mira-k' }),
  value('min_account_age_years'),
  value('min_rank', { value: 'pro', source: 'PAGE', setBy: 'mira-k' }),
  value('contact', { value: 'https://github.com/driftwood-js/driftwood/discussions', source: 'PAGE', setBy: 'mira-k' }),
];
