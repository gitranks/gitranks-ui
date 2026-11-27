import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadInterviewPlanMine, startInterviewPlan, stopInterviewPlan } = await import('./plan-mine.data');
const { loadInterviewPlanAddress } = await import('./plan-address.data');
const { interviewPlanMetadata, INTERVIEW_PLAN_MISSING_METADATA } = await import('./plan-seo');
const { InterviewPlanMineDocument, StartInterviewPlanDocument, StopInterviewPlanDocument } = await import(
  './mine.documents'
);
const { InterviewAddressDocument } = await import('./interviews.documents');
const { seniorInProgress, seniorStopped } = await import('./__fixtures__/mine');
const { northwindSeniorPlan } = await import('./__fixtures__/plans');

const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));
const PLAN = { company: 'northwind', plan: 'senior-software-engineer' };

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockClear();
  cacheTag.mockClear();
});

describe("the person's plan", () => {
  it('is read for the person alone, and null when Interviews is closed to them or the read fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewPlanMine: seniorInProgress });
    expect(await loadInterviewPlanMine('octocat', 'northwind', 'senior-software-engineer')).toEqual(seniorInProgress);
    expect(graphqlDirect.mock.calls[0][0]).toBe(InterviewPlanMineDocument);
    expect(graphqlDirect.mock.calls[0][1]).toEqual(PLAN);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ interviewPlanMine: null });
    expect(await loadInterviewPlanMine('octocat', 'northwind', 'senior-software-engineer')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await loadInterviewPlanMine('octocat', 'northwind', 'senior-software-engineer')).toBeNull();
  });

  it('asks nothing for a slug that is not one', async () => {
    expect(await loadInterviewPlanMine('octocat', 'about', 'senior-software-engineer')).toBeNull();
    expect(await loadInterviewPlanMine('octocat', 'northwind', 'next')).toBeNull();
    expect(await loadInterviewPlanMine('octocat', 'North Wind', 'x')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('starting and stopping a plan', () => {
  it('starts a plan and answers it for the person', async () => {
    graphqlDirect.mockResolvedValueOnce({ startInterviewPlan: seniorInProgress });
    expect(await startInterviewPlan('octocat', PLAN)).toEqual({ ok: true, data: seniorInProgress });
    expect(graphqlDirect.mock.calls[0][0]).toBe(StartInterviewPlanDocument);
    expect(graphqlDirect.mock.calls[0][1]).toEqual(PLAN);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });
  });

  it('stops a plan with the reason picked, or none when it was skipped', async () => {
    graphqlDirect.mockResolvedValue({ stopInterviewPlan: seniorStopped });
    expect(await stopInterviewPlan('octocat', { ...PLAN, reason: 'interview_over' })).toEqual({
      ok: true,
      data: seniorStopped,
    });
    expect(graphqlDirect.mock.calls[0][0]).toBe(StopInterviewPlanDocument);
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ ...PLAN, reason: 'interview_over' });
    await stopInterviewPlan('octocat', PLAN);
    expect(graphqlDirect.mock.calls[1][1]).toEqual({ ...PLAN, reason: null });
    await stopInterviewPlan('octocat', { ...PLAN, reason: null });
    expect(graphqlDirect.mock.calls[2][1]).toEqual({ ...PLAN, reason: null });
  });

  it('refuses a body not of the shape before asking the API', async () => {
    for (const body of [
      {},
      { company: 'northwind' },
      { company: 'about', plan: 'senior-software-engineer' },
      { company: 'northwind', plan: 'next' },
      { company: 'northwind', plan: 7 },
    ]) {
      expect(await startInterviewPlan('octocat', body)).toEqual({ ok: false, error: 'INVALID' });
      expect(await stopInterviewPlan('octocat', body)).toEqual({ ok: false, error: 'INVALID' });
    }
    expect(await stopInterviewPlan('octocat', { ...PLAN, reason: 'bored' })).toEqual({ ok: false, error: 'INVALID' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("maps the API's refusals, and a missing answer is a plan it does not know", async () => {
    graphqlDirect.mockResolvedValueOnce({ startInterviewPlan: null });
    expect(await startInterviewPlan('octocat', PLAN)).toEqual({ ok: false, error: 'NOT_FOUND' });
    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await stopInterviewPlan('octocat', PLAN)).toEqual({ ok: false, error: 'NOT_FOUND' });
    graphqlDirect.mockRejectedValueOnce(apiError('UNAUTHENTICATED'));
    expect(await startInterviewPlan('octocat', PLAN)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await stopInterviewPlan('octocat', PLAN)).toEqual({ ok: false, error: 'FAILED' });
  });
});

describe("a plan's address, when its page is not there", () => {
  it('is moved to a new address of Interviews, kept for hours under the plan and company tags', async () => {
    graphqlDirect.mockResolvedValueOnce({
      interviewAddress: { state: 'moved', to: '/interviews/northwind/mid-senior-software-engineer' },
    });
    expect(await loadInterviewPlanAddress('northwind', 'senior-software-engineer')).toEqual({
      state: 'moved',
      to: '/interviews/northwind/mid-senior-software-engineer',
    });
    expect(graphqlDirect.mock.calls[0][0]).toBe(InterviewAddressDocument);
    expect(graphqlDirect.mock.calls[0][1]).toEqual(PLAN);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
    expect(cacheTag).toHaveBeenLastCalledWith(
      'interviews:plan:northwind:senior-software-engineer',
      'interviews:company:northwind',
    );
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('is gone for a plan taken down or removed', async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewAddress: { state: 'gone', to: null } });
    expect(await loadInterviewPlanAddress('northwind', 'senior-software-engineer')).toEqual({
      state: 'gone',
      to: null,
    });
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('is missing for anything else, kept for minutes: a move to another site, live, none, a failure', async () => {
    for (const answer of [
      { interviewAddress: { state: 'moved', to: 'https://elsewhere.example/x' } },
      { interviewAddress: { state: 'moved', to: '//elsewhere.example/x' } },
      { interviewAddress: { state: 'moved', to: '/learn/courses/algorithms' } },
      { interviewAddress: { state: 'moved', to: null } },
      { interviewAddress: { state: 'live', to: null } },
      { interviewAddress: null },
    ]) {
      graphqlDirect.mockResolvedValueOnce(answer);
      expect(await loadInterviewPlanAddress('northwind', 'senior-software-engineer')).toEqual({
        state: 'missing',
        to: null,
      });
      expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    }
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadInterviewPlanAddress('northwind', 'senior-software-engineer')).toEqual({
      state: 'missing',
      to: null,
    });
  });

  it('asks nothing for a slug that is not one', async () => {
    expect(await loadInterviewPlanAddress('_', '_')).toEqual({ state: 'missing', to: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe("a plan's page for search engines", () => {
  it('has the title and description of the share picture, and is not indexed while closed', () => {
    const metadata = interviewPlanMetadata(northwindSeniorPlan);
    expect(metadata.title).toBe('Northwind · Senior software engineer: an interview plan');
    expect(metadata.description).toBe(
      'The rounds a senior software engineer goes through at Northwind, and what to learn for each. Not an official Northwind page.',
    );
    expect(metadata.alternates?.canonical).toBe('/interviews/northwind/senior-software-engineer');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(interviewPlanMetadata(northwindSeniorPlan, true).robots).toBeUndefined();
    expect(INTERVIEW_PLAN_MISSING_METADATA.robots).toEqual({ index: false, follow: false });
  });
});
