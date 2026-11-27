import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag, everyone } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  everyone: vi.fn(async (_now: number) => false),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('./interviews-everyone', () => ({ interviewsOpenToEveryone: everyone }));

const { EMPTY_INTERVIEWS_HOME, loadInterviewsHome } = await import('./home.data');
const { loadInterviewCompany } = await import('./company.data');
const { loadInterviewPlan } = await import('./plan.data');
const { EMPTY_INTERVIEWS_FOR_COURSE, EMPTY_INTERVIEWS_FOR_COURSES, loadInterviewsForCourse, loadInterviewsForCourses } =
  await import('./learn.data');
const { loadInterviewLogo } = await import('./logo.data');
const { INTERVIEW_LOGO_CLOSED, INTERVIEW_LOGO_PUBLIC, interviewLogoResponse } = await import('./logo-response');
const { loadInterviewsBar } = await import('./interviews-bar.data');
const { reportInterviewFact } = await import('./report.data');
const { INTERVIEWS_ACTION_STATUS, interviewsErrorOf } = await import('./interviews-action');
const { interviewsHome, LOGO_PNG_BASE64, northwindPage } = await import('./__fixtures__/companies');
const { northwindSeniorPlan } = await import('./__fixtures__/plans');
const { forAlgorithms, forCourses } = await import('./__fixtures__/learn');

const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));
const unknownField = new Error(JSON.stringify([{ message: 'Cannot query field "interviewsHome" on type "Query".' }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockClear();
  cacheTag.mockClear();
  everyone.mockReset();
  everyone.mockResolvedValue(false);
});

describe('the public reads, cached for everyone and never throwing', () => {
  it('keeps Interviews home for hours under its tag, and an empty home or a failure for minutes', async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewsHome });
    expect(await loadInterviewsHome()).toEqual(interviewsHome);
    expect(cacheTag).toHaveBeenLastCalledWith('interviews:home');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });

    graphqlDirect.mockResolvedValueOnce({ interviewsHome: { companies: [], positions: [], top: [] } });
    expect(await loadInterviewsHome()).toEqual(EMPTY_INTERVIEWS_HOME);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockRejectedValueOnce(unknownField);
    expect(await loadInterviewsHome()).toEqual(EMPTY_INTERVIEWS_HOME);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
  });

  it("keeps a company's page for hours under its tag; none for minutes; a bad slug asks nothing", async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewCompany: northwindPage });
    expect(await loadInterviewCompany('northwind')).toEqual(northwindPage);
    expect(cacheTag).toHaveBeenLastCalledWith('interviews:company:northwind');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');

    graphqlDirect.mockResolvedValueOnce({ interviewCompany: null });
    expect(await loadInterviewCompany('northwind')).toBeNull();
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadInterviewCompany('northwind')).toBeNull();

    graphqlDirect.mockClear();
    expect(await loadInterviewCompany('mine')).toBeNull();
    expect(await loadInterviewCompany('North Wind')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("keeps a plan's page under its tag and its company's; none for minutes; a bad slug asks nothing", async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewPlan: northwindSeniorPlan });
    expect(await loadInterviewPlan('northwind', 'senior-software-engineer')).toEqual(northwindSeniorPlan);
    expect(cacheTag).toHaveBeenLastCalledWith(
      'interviews:plan:northwind:senior-software-engineer',
      'interviews:company:northwind',
    );
    expect(cacheLife).toHaveBeenLastCalledWith('hours');

    graphqlDirect.mockRejectedValueOnce(apiError('INTERNAL_SERVER_ERROR'));
    expect(await loadInterviewPlan('northwind', 'senior-software-engineer')).toBeNull();
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockClear();
    expect(await loadInterviewPlan('northwind', 'next')).toBeNull();
    expect(await loadInterviewPlan('about', 'sre')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('keeps what Learn shows of Interviews for hours when it holds something, and an empty answer for minutes', async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewsForCourses: forCourses });
    expect(await loadInterviewsForCourses()).toEqual(forCourses);
    expect(cacheTag).toHaveBeenLastCalledWith('interviews:courses');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadInterviewsForCourses()).toEqual(EMPTY_INTERVIEWS_FOR_COURSES);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockResolvedValueOnce({ interviewsForCourse: forAlgorithms });
    expect(await loadInterviewsForCourse('algorithms')).toEqual(forAlgorithms);
    expect(cacheTag).toHaveBeenLastCalledWith('interviews:course:algorithms');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');

    graphqlDirect.mockResolvedValueOnce({ interviewsForCourse: null });
    expect(await loadInterviewsForCourse('algorithms')).toEqual(EMPTY_INTERVIEWS_FOR_COURSE);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockClear();
    expect(await loadInterviewsForCourse('Bad Slug')).toEqual(EMPTY_INTERVIEWS_FOR_COURSE);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe("a company's logo", () => {
  it("keeps a logo for hours under its company's tag, and asks for the size it serves", async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewLogo: LOGO_PNG_BASE64 });
    expect(await loadInterviewLogo('northwind', 64)).toBe(LOGO_PNG_BASE64);
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ company: 'northwind', size: 64 });
    expect(cacheTag).toHaveBeenLastCalledWith('interviews:company:northwind');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('is none for minutes with no logo, a value that is not base64 or a failure; a bad slug asks nothing', async () => {
    for (const answer of [null, '', 'not base64!', '<svg/>']) {
      graphqlDirect.mockResolvedValueOnce({ interviewLogo: answer });
      expect(await loadInterviewLogo('tallgrass', 128)).toBeNull();
      expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    }
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadInterviewLogo('tallgrass', 128)).toBeNull();

    graphqlDirect.mockClear();
    expect(await loadInterviewLogo('about', 64)).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers the PNG, kept by no one while Interviews is closed and publicly once it is open to everyone', async () => {
    graphqlDirect.mockResolvedValue({ interviewLogo: LOGO_PNG_BASE64 });
    const closed = await interviewLogoResponse('northwind', 64, 0);
    expect(closed.status).toBe(200);
    expect(closed.headers.get('Content-Type')).toBe('image/png');
    expect(closed.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(closed.headers.get('Cache-Control')).toBe(INTERVIEW_LOGO_CLOSED);
    expect(Buffer.from(await closed.arrayBuffer()).toString('base64')).toBe(LOGO_PNG_BASE64);

    everyone.mockResolvedValue(true);
    const open = await interviewLogoResponse('northwind', 64, 0);
    expect(open.headers.get('Cache-Control')).toBe(INTERVIEW_LOGO_PUBLIC);
  });

  it('answers 404, kept by no one, with no logo', async () => {
    everyone.mockResolvedValue(true);
    graphqlDirect.mockResolvedValue({ interviewLogo: null });
    const none = await interviewLogoResponse('tallgrass', 128, 0);
    expect(none.status).toBe(404);
    expect(none.headers.get('Cache-Control')).toBe('private, no-store');
  });
});

describe('the bar, read for one person', () => {
  it("is the API's answer for the person, and null when Interviews is closed to them or the read fails", async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewsBar: { mine: true } });
    expect(await loadInterviewsBar('octocat')).toEqual({ mine: true });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValueOnce({ interviewsBar: null });
    expect(await loadInterviewsBar('octocat')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadInterviewsBar('octocat')).toBeNull();
  });
});

describe('"This is wrong"', () => {
  const body = {
    company: 'northwind',
    plan: 'senior-software-engineer',
    fact: 'rounds/3',
    note: '  Four rounds now. ',
  };

  it('sends the report with a trimmed note, from a plan or from a company (no plan)', async () => {
    graphqlDirect.mockResolvedValueOnce({ reportInterviewFact: true });
    expect(await reportInterviewFact('octocat', body)).toEqual({ ok: true, data: true });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({
      company: 'northwind',
      plan: 'senior-software-engineer',
      fact: 'rounds/3',
      note: 'Four rounds now.',
    });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ reportInterviewFact: true });
    expect(await reportInterviewFact('octocat', { company: 'northwind', fact: 'process/steps', note: 'x' })).toEqual({
      ok: true,
      data: true,
    });
    expect(graphqlDirect.mock.calls[1][1]).toMatchObject({ plan: null });
  });

  it('refuses a body not of the shape before asking the API', async () => {
    for (const bad of [
      { ...body, company: 'mine' },
      { ...body, company: 3 },
      { ...body, plan: 'next' },
      { ...body, plan: 7 },
      { ...body, fact: '' },
      { ...body, fact: 'rounds//3' },
      { ...body, fact: 'Rounds/3' },
      { ...body, fact: `a${'/a'.repeat(100)}` },
      { ...body, note: '   ' },
      { ...body, note: 'x'.repeat(501) },
      { ...body, note: undefined },
    ]) {
      expect(await reportInterviewFact('octocat', bad)).toEqual({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("maps the API's refusals: not found, the day's limit, a sign-in, anything else", async () => {
    graphqlDirect.mockResolvedValueOnce({ reportInterviewFact: false });
    expect(await reportInterviewFact('octocat', body)).toEqual({ ok: false, error: 'NOT_FOUND' });
    graphqlDirect.mockRejectedValueOnce(apiError('TOO_MANY_REQUESTS'));
    expect(await reportInterviewFact('octocat', body)).toEqual({ ok: false, error: 'LIMITED' });
    graphqlDirect.mockRejectedValueOnce(apiError('RATE_LIMITED'));
    expect(await reportInterviewFact('octocat', body)).toEqual({ ok: false, error: 'LIMITED' });
    graphqlDirect.mockRejectedValueOnce(apiError('UNAUTHENTICATED'));
    expect(await reportInterviewFact('octocat', body)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await reportInterviewFact('octocat', body)).toEqual({ ok: false, error: 'FAILED' });
  });

  it('answers each refusal with its own status', () => {
    expect(interviewsErrorOf(apiError('BAD_USER_INPUT'))).toBe('INVALID');
    expect(interviewsErrorOf(apiError('NOT_FOUND'))).toBe('NOT_FOUND');
    expect(INTERVIEWS_ACTION_STATUS).toEqual({
      SIGNED_OUT: 401,
      NOT_FOUND: 404,
      INVALID: 400,
      LIMITED: 429,
      FAILED: 502,
    });
  });
});
