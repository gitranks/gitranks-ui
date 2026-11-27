import type {
  InterviewCompanyCard,
  InterviewCompanyPage,
  InterviewCompanyRef,
  InterviewFact,
  InterviewPlanCard,
  InterviewPosition,
  InterviewSource,
  InterviewsHome,
} from '../types';

/*
 * Two made-up companies, so no spec or page reads as a fact about a real one. Northwind is the full case: three
 * positions, levels with plans of their own, every kind of fact, a list of values, its own course and a logo.
 * Tallgrass is the small one: one position whose levels the sources do not tell apart, a round with nothing to
 * prepare with yet, no values and no logo. Every site is under `.example`, a name no real site has.
 */

/** The day the research of both was read: "today" in every fixture. */
export const INTERVIEWS_FIXTURE_NOW = '2026-11-27T12:00:00.000Z';
/** The day both companies' facts were last checked. */
export const CHECKED_AT = '2026-11-26';

export const northwind: InterviewCompanyRef = { slug: 'northwind', name: 'Northwind', logo: true };
export const tallgrass: InterviewCompanyRef = { slug: 'tallgrass', name: 'Tallgrass', logo: false };

export const softwareEngineer: InterviewPosition = { slug: 'software-engineer', name: 'Software engineer' };
export const siteReliabilityEngineer: InterviewPosition = {
  slug: 'site-reliability-engineer',
  name: 'Site reliability engineer',
};
export const engineeringManager: InterviewPosition = { slug: 'engineering-manager', name: 'Engineering manager' };

const source = (fields: Omit<InterviewSource, 'readAt' | 'says' | 'how' | 'title'> & Partial<InterviewSource>) =>
  ({ readAt: CHECKED_AT, says: null, how: 'fetched', title: null, ...fields }) satisfies InterviewSource;

/** Northwind's sources: its own pages, a handbook, two candidates' reports from two sites, a guide, news, a listing. */
export const northwindSources: InterviewSource[] = [
  source({
    id: 'o1',
    url: 'https://careers.northwind.example/interviews',
    site: 'careers.northwind.example',
    title: 'How we interview',
    kind: 'official',
    published: '2026-05',
    says: 'What each round checks, and how to get ready for it.',
  }),
  source({
    id: 'o2',
    url: 'https://careers.northwind.example/ai-in-interviews',
    site: 'careers.northwind.example',
    title: 'Using AI in our interviews',
    kind: 'official',
    published: '2026-02',
    says: 'AI tools are not allowed in live rounds.',
  }),
  source({
    id: 'h1',
    url: 'https://handbook.example/northwind/levels',
    site: 'handbook.example',
    title: 'Engineering levels at Northwind',
    kind: 'handbook',
    published: '2025-09',
  }),
  source({
    id: 'r1',
    url: 'https://forum.example/t/northwind-senior-loop',
    site: 'forum.example',
    title: 'My Northwind loop, senior, this year',
    kind: 'candidate_report',
    published: '2026-09',
  }),
  source({
    id: 'r2',
    url: 'https://reports.example/northwind/onsite',
    site: 'reports.example',
    title: 'Northwind onsite, four rounds',
    kind: 'candidate_report',
    published: '2026-03',
    how: 'search_summary',
  }),
  source({
    id: 'g1',
    url: 'https://guides.example/northwind-interview-process',
    site: 'guides.example',
    title: 'The Northwind interview process',
    kind: 'guide',
    published: '2026-10',
    how: 'browser',
  }),
  source({
    id: 'n1',
    url: 'https://news.example/2025/11/northwind-hiring',
    site: 'news.example',
    title: 'Northwind changes how it hires',
    kind: 'news',
    published: '2025-11-04',
  }),
  source({
    id: 'l1',
    url: 'https://jobs.example/northwind/senior-software-engineer',
    site: 'jobs.example',
    title: null,
    kind: 'listing',
    published: null,
  }),
];

/** Tallgrass's sources: one page of its own, one candidate's report and a guide read through search results. */
export const tallgrassSources: InterviewSource[] = [
  source({
    id: 't1',
    url: 'https://careers.tallgrass.example/working-here',
    site: 'careers.tallgrass.example',
    title: 'Working at Tallgrass',
    kind: 'official',
    published: '2025-04',
    says: 'A short outline of hiring for all roles.',
  }),
  source({
    id: 't2',
    url: 'https://forum.example/t/tallgrass-sre',
    site: 'forum.example',
    title: 'Tallgrass SRE interview',
    kind: 'candidate_report',
    published: '2026-06',
  }),
  source({
    id: 't3',
    url: 'https://guides.example/tallgrass',
    site: 'guides.example',
    title: 'Tallgrass interviews, in short',
    kind: 'guide',
    published: '2026-01',
    how: 'search_summary',
  }),
];

/** What is true for every interview at Northwind, in the order its page lists it. */
export const northwindProcess: InterviewFact[] = [
  {
    key: 'process/ai-in-interviews',
    name: 'Help from AI',
    value: 'Not allowed in live rounds.',
    note: 'Northwind says any use ends the interview.',
    basis: 'official',
    sources: ['o2'],
  },
  {
    key: 'process/video-or-in-person',
    name: 'Where it happens',
    value: 'Video calls, with a shared editor for code.',
    note: null,
    basis: 'official',
    sources: ['o1'],
  },
  {
    key: 'process/hiring-committee',
    name: 'Who decides',
    value: 'A group of engineers who did not interview you reads the feedback and decides, and at which level.',
    note: null,
    basis: 'both',
    sources: ['o1', 'r1'],
  },
  {
    key: 'process/team-matching',
    name: 'Team match',
    value: 'After the decision, one or two calls with teams that have an opening.',
    note: null,
    basis: 'reported',
    sources: ['r1', 'r2'],
  },
];

/** What Northwind looks for: its values, joined across positions. */
export const northwindValues: InterviewFact[] = [
  {
    key: 'values/ownership',
    name: 'Ownership',
    value: null,
    note: 'You follow a problem to its end, past the edge of your own team.',
    basis: 'official',
    sources: ['o1'],
  },
  {
    key: 'values/clear-writing',
    name: 'Clear writing',
    value: null,
    note: 'Decisions are made in short written notes, and you are asked about yours.',
    basis: 'both',
    sources: ['o1', 'r1'],
  },
];

/** How long Northwind's process takes, from its levels' timelines. */
export const northwindTimeline: InterviewFact = {
  key: 'timeline',
  name: 'How long it takes',
  value: '4 to 8 weeks',
  note: 'From the first call to the offer.',
  basis: 'reported',
  sources: ['r1', 'r2'],
};

const card = (fields: InterviewPlanCard) => fields;

export const northwindEntrySoftwareEngineerCard = card({
  company: northwind,
  slug: 'entry-software-engineer',
  name: 'Entry level software engineer',
  position: softwareEngineer,
  levels: ['entry'],
  levelNames: ['N1'],
  roundCount: 4,
  lessons: 43,
  projects: 0,
});

export const northwindMidSoftwareEngineerCard = card({
  company: northwind,
  slug: 'mid-software-engineer',
  name: 'Mid level software engineer',
  position: softwareEngineer,
  levels: ['mid'],
  levelNames: ['N2'],
  roundCount: 5,
  lessons: 57,
  projects: 0,
});

export const northwindSeniorSoftwareEngineerCard = card({
  company: northwind,
  slug: 'senior-software-engineer',
  name: 'Senior software engineer',
  position: softwareEngineer,
  levels: ['senior'],
  levelNames: ['N3'],
  roundCount: 5,
  lessons: 65,
  projects: 0,
});

export const northwindStaffSoftwareEngineerCard = card({
  company: northwind,
  slug: 'staff-software-engineer',
  name: 'Staff software engineer',
  position: softwareEngineer,
  levels: ['staff'],
  levelNames: ['N4'],
  roundCount: 5,
  lessons: 54,
  projects: 0,
});

export const northwindMidSeniorSreCard = card({
  company: northwind,
  slug: 'mid-senior-site-reliability-engineer',
  name: 'Site reliability engineer, mid level and senior',
  position: siteReliabilityEngineer,
  levels: ['mid', 'senior'],
  levelNames: ['N2', 'N3'],
  roundCount: 4,
  lessons: 38,
  projects: 0,
});

export const northwindStaffSreCard = card({
  company: northwind,
  slug: 'staff-site-reliability-engineer',
  name: 'Staff site reliability engineer',
  position: siteReliabilityEngineer,
  levels: ['staff'],
  levelNames: ['N4'],
  roundCount: 4,
  lessons: 34,
  projects: 0,
});

export const northwindEngineeringManagerCard = card({
  company: northwind,
  slug: 'engineering-manager',
  name: 'Engineering manager',
  position: engineeringManager,
  levels: ['senior', 'staff'],
  levelNames: [],
  roundCount: 4,
  lessons: 29,
  projects: 0,
});

/** Every plan of Northwind, by position and then by level. */
export const northwindPlanCards: InterviewPlanCard[] = [
  northwindEntrySoftwareEngineerCard,
  northwindMidSoftwareEngineerCard,
  northwindSeniorSoftwareEngineerCard,
  northwindStaffSoftwareEngineerCard,
  northwindMidSeniorSreCard,
  northwindStaffSreCard,
  northwindEngineeringManagerCard,
];

/** Tallgrass's one plan: its sources do not tell the levels apart, so it is for all of them. */
export const tallgrassSreCard = card({
  company: tallgrass,
  slug: 'site-reliability-engineer',
  name: 'Site reliability engineer',
  position: siteReliabilityEngineer,
  levels: ['mid', 'senior'],
  levelNames: [],
  roundCount: 3,
  lessons: 16,
  projects: 0,
});

/** Northwind's page: the full case. */
export const northwindPage: InterviewCompanyPage = {
  company: northwind,
  line: 'How Northwind interviews engineers, and a plan to prepare for each position.',
  checkedAt: CHECKED_AT,
  positions: [
    {
      position: softwareEngineer,
      plans: [
        northwindEntrySoftwareEngineerCard,
        northwindMidSoftwareEngineerCard,
        northwindSeniorSoftwareEngineerCard,
        northwindStaffSoftwareEngineerCard,
      ],
    },
    { position: siteReliabilityEngineer, plans: [northwindMidSeniorSreCard, northwindStaffSreCard] },
    { position: engineeringManager, plans: [northwindEngineeringManagerCard] },
  ],
  leftOut: ['Data engineer'],
  process: northwindProcess,
  values: northwindValues,
  official: northwindSources.filter((one) => one.kind === 'official'),
  sources: northwindSources,
  course: { slug: 'interviewing-at-northwind', name: 'Interviewing at Northwind', lessons: 12 },
  githubOrg: 'northwind-example',
  courses: 4,
  timeline: northwindTimeline,
  disagreements: { count: 3, example: 'whether the team match comes before or after the decision' },
};

/** Tallgrass's page: the small case. */
export const tallgrassPage: InterviewCompanyPage = {
  company: tallgrass,
  line: 'How Tallgrass interviews engineers, and a plan to prepare for each position.',
  checkedAt: CHECKED_AT,
  positions: [{ position: siteReliabilityEngineer, plans: [tallgrassSreCard] }],
  leftOut: [],
  process: [
    {
      key: 'process/video-or-in-person',
      name: 'Where it happens',
      value: 'Video calls.',
      note: null,
      basis: 'official',
      sources: ['t1'],
    },
  ],
  values: [],
  official: tallgrassSources.filter((one) => one.kind === 'official'),
  sources: tallgrassSources,
  course: null,
  githubOrg: null,
  courses: 2,
  timeline: null,
  disagreements: null,
};

export const northwindCard: InterviewCompanyCard = {
  company: northwind,
  otherNames: ['Northwind Labs'],
  positions: [softwareEngineer, siteReliabilityEngineer, engineeringManager],
  plans: northwindPlanCards,
};

export const tallgrassCard: InterviewCompanyCard = {
  company: tallgrass,
  otherNames: [],
  positions: [siteReliabilityEngineer],
  plans: [tallgrassSreCard],
};

/** Interviews home: both companies, the most plans first. */
export const interviewsHome: InterviewsHome = {
  companies: [northwindCard, tallgrassCard],
  positions: [softwareEngineer, siteReliabilityEngineer, engineeringManager],
  top: [northwind, tallgrass],
};

/** A 1 px PNG, as the API sends a logo file. */
export const LOGO_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
