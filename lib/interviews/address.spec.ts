import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { movedPathOf } = await import('./address');
const { loadInterviewAddress } = await import('./address.data');
const { InterviewAddressDocument } = await import('./interviews.documents');

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockClear();
  cacheTag.mockClear();
});

describe('where a moved address leads', () => {
  it("is the new page, from each form of the API's address", () => {
    expect(movedPathOf({ state: 'moved', to: '/interviews/northwind/mid-senior-software-engineer' })).toBe(
      '/interviews/northwind/mid-senior-software-engineer',
    );
    expect(movedPathOf({ state: 'moved', to: 'northwind/senior-software-engineer' })).toBe(
      '/interviews/northwind/senior-software-engineer',
    );
    expect(movedPathOf({ state: 'moved', to: 'northwind' })).toBe('/interviews/northwind');
  });

  it('is nothing for every other state, and for an address that is not one of our pages', () => {
    expect(movedPathOf({ state: 'live', to: null })).toBeNull();
    expect(movedPathOf({ state: 'gone', to: null })).toBeNull();
    expect(movedPathOf({ state: 'missing', to: null })).toBeNull();
    expect(movedPathOf({ state: 'moved', to: null })).toBeNull();
    expect(movedPathOf(null)).toBeNull();
    for (const to of ['https://example.com/x', '//example.com', 'about', 'northwind/next', 'a/b/c', '', '/learn/x']) {
      expect(movedPathOf({ state: 'moved', to })).toBeNull();
    }
  });
});

describe("an address's state, read for everyone", () => {
  it("keeps the API's answer for hours under the company's tag, and the plan's", async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewAddress: { state: 'gone', to: null } });
    expect(await loadInterviewAddress('northwind', null)).toEqual({ state: 'gone', to: null });
    expect(graphqlDirect).toHaveBeenCalledWith(
      InterviewAddressDocument,
      { company: 'northwind', plan: null },
      { source: 'ssr' },
    );
    expect(cacheTag).toHaveBeenCalledWith('interviews:company:northwind');
    expect(cacheLife).toHaveBeenCalledWith('hours');

    graphqlDirect.mockResolvedValueOnce({ interviewAddress: { state: 'moved', to: 'northwind/x' } });
    await loadInterviewAddress('northwind', 'old-plan');
    expect(cacheTag).toHaveBeenCalledWith('interviews:plan:northwind:old-plan');
  });

  it('is null for minutes on a failure, and missing for a slug no company can have, asking nothing', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadInterviewAddress('northwind', null)).toBeNull();
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
    graphqlDirect.mockReset();
    expect(await loadInterviewAddress('about', null)).toEqual({ state: 'missing', to: null });
    expect(await loadInterviewAddress('Not A Slug', null)).toEqual({ state: 'missing', to: null });
    expect(await loadInterviewAddress('northwind', 'next')).toEqual({ state: 'missing', to: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
