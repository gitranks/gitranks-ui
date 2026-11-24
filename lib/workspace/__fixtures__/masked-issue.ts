import type {
  FairUseAppeal,
  FullIssue,
  IssueLooksToday,
  IssueNumbers,
  IssuePage,
  MaskedIssue,
} from '../masked-issue.types';

/** The catalogue's clock: 28 Oct 2026, 12:00 UTC. */
export const MASKED_NOW = new Date('2026-10-28T12:00:00.000Z');

/** A masked issue with two good signs, as a list shows it. */
export const maskedIssue = (patch: Partial<MaskedIssue> = {}): MaskedIssue => ({
  id: 'q7k2m9xa',
  title: 'Tags show twice in a sidebar after one of them is renamed',
  language: 'TypeScript',
  size: 'S',
  kind: 'bug',
  projectTier: 4,
  project: null,
  hints: [
    { kind: 'AGREED', count: null },
    { kind: 'MERGES_OUTSIDE', count: null },
  ],
  ...patch,
});

/** More masked issues, for a list. */
export const maskedIssues: MaskedIssue[] = [
  maskedIssue(),
  maskedIssue({
    id: 'r3n8p1vd',
    title: 'Finding a record by email gets slow when an import is large',
    language: 'Python',
    kind: 'performance',
    projectTier: 3,
    hints: [{ kind: 'MERGES_OUTSIDE', count: null }],
  }),
  maskedIssue({
    id: 't5w0c4hy',
    title: 'A list of retries keeps growing while a delivery keeps failing',
    language: 'Go',
    kind: 'bug',
    projectTier: 7,
    hints: [
      { kind: 'AGREED', count: null },
      { kind: 'MERGED_HERE', count: 2 },
    ],
  }),
];

/** The same issue in full, for the person who holds it. */
export const fullIssue = (patch: Partial<FullIssue> = {}): FullIssue => ({
  id: 'q7k2m9xa',
  repo: 'tessera-ui/tessera',
  number: 1290,
  url: 'https://github.com/tessera-ui/tessera/issues/1290',
  title: 'Duplicate tags appear in the sidebar after a rename',
  labels: ['bug', 'sidebar'],
  stars: 18_400,
  agreementToSign: false,
  ...patch,
});

/** 20 full issues a day for a Skilled account, 17 left. */
export const looksToday = (patch: Partial<IssueLooksToday> = {}): IssueLooksToday => ({
  limit: 20,
  left: 17,
  tier: 2,
  base: 20,
  merged: 0,
  warned: false,
  ...patch,
});

/** A Rookie account at the day's limit. */
export const looksAtLimit = looksToday({ limit: 10, left: 0, tier: 1, base: 10 });

/** The numbers of a night. */
export const issueNumbers: IssueNumbers = {
  read: 2_707_100,
  kept: 3_138,
  at: '2026-10-28T03:40:00.000Z',
  rulesLive: true,
};

/** Held until 12:14, 14 minutes after the catalogue's clock. */
export const HELD_UNTIL = '2026-10-28T12:14:00.000Z';

/** The page of one issue in a state, from the masked issue above. */
export const issuePage = (patch: Partial<IssuePage> = {}): IssuePage => ({
  state: 'MASKED',
  masked: maskedIssue(),
  full: null,
  until: null,
  holding: null,
  reasons: [],
  note: null,
  startPath: null,
  looks: looksToday(),
  ...patch,
});

/** The page right after the press: the issue in full, held. */
export const fullPage = (patch: Partial<IssuePage> = {}): IssuePage =>
  issuePage({ state: 'FULL', full: fullIssue(), until: HELD_UNTIL, looks: looksToday({ left: 16 }), ...patch });

/** A request to look again, not answered yet. */
export const openAppeal: FairUseAppeal = { at: '2026-10-27T09:30:00.000Z', answeredAt: null };
