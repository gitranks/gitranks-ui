import type { Route } from 'next';

/**
 * Every address of Interviews' pages, of the routes the browser reads a person's side from, and Interviews' cache
 * tags, built here and nowhere else.
 */

/** Interviews home: the landing for a visitor and for a person with no plan, the person's own home once they have one. */
export const INTERVIEWS_HOME_PATH = '/interviews' as Route;
/** The signed-in person's plans. */
export const INTERVIEWS_MINE_PATH = '/interviews/mine' as Route;
/** "How it works": the same page for everyone. */
export const INTERVIEWS_ABOUT_PATH = '/interviews/about' as Route;

/** The sizes of a company's logo file the site serves: 64 px up to a 20 px logo, 128 px above. */
export const INTERVIEW_LOGO_SIZES = [64, 128] as const;
export type InterviewLogoSize = (typeof INTERVIEW_LOGO_SIZES)[number];

/** A company's page. */
export const interviewCompanyPath = (company: string) => `/interviews/${encodeURIComponent(company)}` as Route;
/** A plan's page. */
export const interviewPlanPath = (company: string, plan: string) =>
  `${interviewCompanyPath(company)}/${encodeURIComponent(plan)}` as Route;
/** The connecting screen, after one part of a plan (`after`: the part's key). */
export const interviewNextPath = (company: string, plan: string, after: string) =>
  `${interviewPlanPath(company, plan)}/next?after=${encodeURIComponent(after)}` as Route;
/** A company's logo file of one size. */
export const interviewLogoPath = (company: string, size: InterviewLogoSize) =>
  `${interviewCompanyPath(company)}/logo-${size}.png`;

/** The query a lesson opened from a plan carries: `?plan=<company>/<plan>`. */
export const PLAN_QUERY = 'plan';
/** Learn's lesson, opened from a plan: Learn's own address with the plan in its query. */
export const interviewLessonPath = (lesson: string, company: string, plan: string) =>
  `/learn/lessons/${encodeURIComponent(lesson)}?${PLAN_QUERY}=${encodeURIComponent(company)}/${encodeURIComponent(plan)}` as Route;
/** A Learn course a plan uses. */
export const interviewCoursePath = (course: string) => `/learn/courses/${encodeURIComponent(course)}` as Route;

/*
 * Where the browser reads the signed-in person's side of each page, and sends their writes. Every route answers for
 * the session's own person and is never kept.
 */

/** Whether Interviews is open to the signed-in person. */
export const INTERVIEWS_OPEN_MINE_PATH = '/api/me/interviews/open';
/** Interviews' bar. */
export const INTERVIEWS_BAR_MINE_PATH = '/api/me/interviews/bar';
/** My interviews: the plans in progress and the finished ones. */
export const INTERVIEWS_MINE_MINE_PATH = '/api/me/interviews/mine';
/** Sends one "This is wrong" (`POST`, `{ company, plan, fact, note }`). */
export const INTERVIEWS_REPORT_MINE_PATH = '/api/me/interviews/report';
/** One plan for the person: where they stand in each round and item (`GET`). */
export const interviewPlanMinePath = (company: string, plan: string) =>
  `/api/me/interviews/plans/${encodeURIComponent(company)}/${encodeURIComponent(plan)}`;
/** Starts a plan, or starts a stopped one again (`POST`, `{ company, plan }`). */
export const INTERVIEWS_START_MINE_PATH = '/api/me/interviews/start';
/** Stops a plan (`POST`, `{ company, plan, reason }`, the reason null when skipped). */
export const INTERVIEWS_STOP_MINE_PATH = '/api/me/interviews/stop';
/** The query a plan's address carries after a visitor signs in to start it: the page then starts the plan. */
export const PLAN_START_QUERY = 'start';

/*
 * Cache tags. The public pages are kept for hours under them, and the API expires them when the content changes.
 */

/** Interviews home. */
export const INTERVIEWS_HOME_TAG = 'interviews:home';
/** What Learn's Courses page shows of Interviews. */
export const INTERVIEWS_COURSES_TAG = 'interviews:courses';
/** A company's page, and its logo. */
export const interviewCompanyTag = (company: string) => `interviews:company:${company}`;
/** A plan's page. */
export const interviewPlanTag = (company: string, plan: string) => `interviews:plan:${company}:${plan}`;
/** What one Learn course's pages show of Interviews. */
export const interviewCourseTag = (course: string) => `interviews:course:${course}`;

const INTERVIEW_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX_LENGTH = 100;

/** The slugs no company may have: Interviews' own pages sit at those addresses. */
export const RESERVED_COMPANY_SLUGS: ReadonlySet<string> = new Set(['about', 'mine']);
/** The slugs no plan may have: the connecting screen sits at that address. */
export const RESERVED_PLAN_SLUGS: ReadonlySet<string> = new Set(['next']);

/** Whether a slug has the shape a company's, a plan's or a Learn course's slug has: asked of the API only then. */
export const isInterviewSlug = (slug: string): boolean => slug.length <= SLUG_MAX_LENGTH && INTERVIEW_SLUG.test(slug);
/** Whether a slug can be a company's: of the shape, and not one of Interviews' own pages. */
export const isInterviewCompanySlug = (slug: string): boolean =>
  isInterviewSlug(slug) && !RESERVED_COMPANY_SLUGS.has(slug);
/** Whether a slug can be a plan's: of the shape, and not the connecting screen. */
export const isInterviewPlanSlug = (slug: string): boolean => isInterviewSlug(slug) && !RESERVED_PLAN_SLUGS.has(slug);

/** Whether a tag is one of Interviews', as the API sends it to be expired. */
export function isInterviewsTag(tag: string): boolean {
  if (tag === INTERVIEWS_HOME_TAG || tag === INTERVIEWS_COURSES_TAG) return true;
  const company = /^interviews:company:(.*)$/s.exec(tag)?.[1];
  if (company !== undefined) return isInterviewCompanySlug(company);
  const course = /^interviews:course:(.*)$/s.exec(tag)?.[1];
  if (course !== undefined) return isInterviewSlug(course);
  const plan = /^interviews:plan:([^:]*):(.*)$/s.exec(tag);
  return !!plan && isInterviewCompanySlug(plan[1]) && isInterviewPlanSlug(plan[2]);
}

/**
 * Whether a path is one of Interviews' addresses: `/interviews`, everything under it (the logos and pictures
 * included), and the home's Markdown copy, `/interviews.md`. The proxy's gate closes them all.
 */
export const isInterviewsPath = (pathname: string): boolean => /^\/interviews(?:\/|\.md$|$)/.test(pathname);
