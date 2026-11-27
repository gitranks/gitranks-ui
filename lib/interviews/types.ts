/*
 * What the API answers about Interviews, field for field: the public reads (home, a company, a plan, a logo, what
 * Learn's pages show, an address) and the signed-in person's own (the bar, their plans, where they stand). Dates are
 * ISO strings; a source's `published` is a month or a day as the research wrote it (`2025-05`, `2026-03-14`).
 */

/** A company as every page names it. `logo`: whether the company has logo files the site may draw. */
export type InterviewCompanyRef = { slug: string; name: string; logo: boolean };

/** Who states a fact: the company's own pages, candidates' reports, or both. */
export const INTERVIEW_BASES = ['official', 'reported', 'both'] as const;
export type InterviewBasis = (typeof INTERVIEW_BASES)[number];

/** What a source is. */
export const INTERVIEW_SOURCE_KINDS = ['official', 'handbook', 'candidate_report', 'guide', 'news', 'listing'] as const;
export type InterviewSourceKind = (typeof INTERVIEW_SOURCE_KINDS)[number];

/** How a source was read: opened, or known only from what a search result said of it. */
export type InterviewSourceHow = 'fetched' | 'browser' | 'search_summary';

/** One source of the facts. `says`: one line, for the company's own pages only. */
export type InterviewSource = {
  id: string;
  url: string;
  site: string;
  title: string | null;
  kind: InterviewSourceKind;
  published: string | null;
  readAt: string;
  says: string | null;
  how: InterviewSourceHow;
};

/** A fact: its key (what "This is wrong" names), its heading, its value and note, who states it and its sources' ids. */
export type InterviewFact = {
  key: string;
  name: string;
  value: string | null;
  note: string | null;
  basis: InterviewBasis;
  sources: string[];
};

/** A Learn course or group, or a Build project, as a plan names it. */
export type InterviewNamed = { slug: string; name: string };

/**
 * One thing a round offers. `key`: the part's identifier, `<course>/<group>` or `project/<slug>`. Lessons: a Learn
 * group, its number of live lessons and its first lesson's slug. A project (not drawn yet): a Build project and its
 * number of steps.
 */
export type InterviewItem =
  | { type: 'lessons'; key: string; course: InterviewNamed; group: InterviewNamed; lessons: number; first: string }
  | { type: 'project'; key: string; project: InterviewNamed; steps: number };

/** The rule on help from AI in a round. */
export type InterviewAi = 'banned' | 'allowed' | 'expected';

/** One round of a plan, in order. `thin`: it rests on fewer sources than a fact needs, and the page says so. */
export type InterviewRound = {
  number: number;
  kind: string;
  title: string;
  /** How many: `"2-3"`, `"0-1"`; null when the sources do not say. */
  count: string | null;
  /** How long, in minutes: `"45"`, `"45-60"`; null when the sources do not say. */
  minutes: string | null;
  ai: InterviewAi | null;
  checks: string | null;
  format: string | null;
  notes: string | null;
  basis: InterviewBasis;
  sources: string[];
  thin: boolean;
  key: string;
  items: InterviewItem[];
};

/** A position, as the fixed list names it. */
export type InterviewPosition = { slug: string; name: string };

/** A plan as a card or a row shows it. `levels`: the level ids; `levelNames`: the company's own names for them. */
export type InterviewPlanCard = {
  company: InterviewCompanyRef;
  slug: string;
  name: string;
  position: InterviewPosition;
  levels: string[];
  levelNames: string[];
  roundCount: number;
  lessons: number;
  projects: number;
};

/**
 * A plan's page. `after`: the dashed part after the rounds, in order (a round no one prepares for becomes a fact
 * here, and is not in `rounds` or `roundCount`). `timeline`: drawn on its own, not repeated in `after`. `others`: the
 * company's other plans.
 */
export type InterviewPlanPage = InterviewPlanCard & {
  line: string;
  checkedAt: string;
  rounds: InterviewRound[];
  after: InterviewFact[];
  timeline: InterviewFact | null;
  sources: InterviewSource[];
  others: InterviewPlanCard[];
};

/** A company's page. `leftOut`: the positions with no plan; `courses`: the Learn courses its plans use. */
export type InterviewCompanyPage = {
  company: InterviewCompanyRef;
  line: string;
  checkedAt: string;
  positions: { position: InterviewPosition; plans: InterviewPlanCard[] }[];
  leftOut: string[];
  process: InterviewFact[];
  values: InterviewFact[];
  official: InterviewSource[];
  sources: InterviewSource[];
  course: { slug: string; name: string; lessons: number } | null;
  githubOrg: string | null;
  courses: number;
  /** "How long it takes", from the levels' timelines. */
  timeline: InterviewFact | null;
  disagreements: { count: number; example: string } | null;
};

/** A company as Interviews home lists it, with its plans, so the search can list a position's plans across companies. */
export type InterviewCompanyCard = {
  company: InterviewCompanyRef;
  otherNames: string[];
  positions: InterviewPosition[];
  plans: InterviewPlanCard[];
};

/** Interviews home: every listed company, most plans first; the positions that have a plan; the top five. */
export type InterviewsHome = {
  companies: InterviewCompanyCard[];
  positions: InterviewPosition[];
  top: InterviewCompanyRef[];
};

/**
 * What Learn's Courses page shows of Interviews: the top five; each company with the courses its plans use (`rounds`:
 * the rounds' names; `lessons`: the live lessons it uses); the course cards of the Interviews section.
 */
export type InterviewsForCourses = {
  top: InterviewCompanyRef[];
  companies: {
    company: InterviewCompanyRef;
    otherNames: string[];
    courses: { slug: string; rounds: string[]; lessons: number }[];
  }[];
  section: { slug: string; name: string; lessons: number; company: InterviewCompanyRef | null }[];
};

/**
 * What one Learn course's pages show of Interviews: the companies whose plans use it; for each group, the topic and
 * the companies that report it; and for a company's own course, the company, its last check and its plans.
 */
export type InterviewsForCourse = {
  companies: InterviewCompanyRef[];
  groups: { group: string; topic: string; companies: InterviewCompanyRef[]; basis: InterviewBasis }[];
  own: { company: InterviewCompanyRef; checkedAt: string; plans: InterviewPlanCard[] } | null;
};

/** Where a company's or a plan's address stands. `to`: the new address of a moved plan. */
export type InterviewAddress = { state: 'live' | 'moved' | 'gone' | 'missing'; to: string | null };

/* The signed-in person's own. */

/** Interviews' bar: whether the person has a plan in progress or finished. */
export type InterviewsBar = { mine: boolean };

/** Where a round stands for the person; `none` for a round with nothing to do. */
export type InterviewRoundState = 'done' | 'started' | 'to_come' | 'none';

/** One item for the person: lessons done of all, the next lesson's slug, and each lesson in order (the strip's squares). */
export type InterviewItemMine = {
  key: string;
  done: number;
  of: number;
  next: string | null;
  lessons: { slug: string; done: boolean }[];
};

/**
 * One plan for the person. `here`: the round "You are here" points to; `learnedBefore`: the plan's lessons learned
 * before it was started; `next`: the keys of the round and the item to go on with; `reviewDue`: a lesson of the plan
 * is due in Learn's review; `justDone`: the number of the round just finished.
 */
export type InterviewPlanMine = {
  state: 'none' | 'in_progress' | 'stopped' | 'finished';
  startedAt: string | null;
  finishedAt: string | null;
  stoppedAt: string | null;
  here: number | null;
  learnedBefore: number;
  rounds: { key: string; number: number; state: InterviewRoundState; items: InterviewItemMine[] }[];
  next: { round: string; item: string; lesson: string | null } | null;
  reviewDue: boolean;
  justDone: number | null;
};

/** The connecting screen: what was just done, and the person's plan now. */
export type InterviewNext = {
  done: { kind: 'part' | 'round' | 'plan'; name: string; lessons: number };
  mine: InterviewPlanMine;
};

/** Why a person stops a plan; none when they skip the question. */
export const INTERVIEW_STOP_REASONS = [
  'only_looking',
  'interview_over',
  'another_plan',
  'does_not_fit',
  'something_else',
] as const;
export type InterviewStopReason = (typeof INTERVIEW_STOP_REASONS)[number];

/** One of the person's plans as a row: where they stand, the rounds as marks and the next thing. */
export type InterviewPlanRow = {
  plan: InterviewPlanCard;
  state: 'in_progress' | 'finished';
  finishedAt: string | null;
  workedAt: string;
  here: number | null;
  justDone: number | null;
  rounds: { key: string; state: InterviewRoundState }[];
  next: {
    round: string;
    roundName: string;
    item: string;
    itemName: string;
    lessons: number;
    lesson: string | null;
  } | null;
};

/** The person's plans in progress, the one worked on last first. */
export type InterviewsMyHome = { plans: InterviewPlanRow[] };

/** My interviews: the plans in progress, then the finished ones. */
export type InterviewsMine = { inProgress: InterviewPlanRow[]; finished: InterviewPlanRow[] };
