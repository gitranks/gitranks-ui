import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { interviewsHome, northwindPage } from '@/lib/interviews/__fixtures__/companies';
import { northwindSeniorPlan } from '@/lib/interviews/__fixtures__/plans';

vi.mock('server-only', () => ({}));
vi.mock('next/server', async (actual) => ({ ...(await actual<object>()), connection: vi.fn(async () => {}) }));
vi.mock('@/lib/interviews/home.data', () => ({ loadInterviewsHome: vi.fn() }));
vi.mock('@/lib/interviews/share.data', () => ({
  loadCardLogos: vi.fn(),
  loadInterviewCompanyShare: vi.fn(),
  loadInterviewPlanShare: vi.fn(),
}));

const { loadInterviewsHome } = await import('@/lib/interviews/home.data');
const { loadInterviewCompanyShare, loadInterviewPlanShare } = await import('@/lib/interviews/share.data');
const { companyCardVersionOf, interviewsCardVersionOf, planCardVersionOf } = await import(
  '@/lib/interviews/share-card'
);
const homeCard = await import('./card.png/route');
const homeCopy = await import('./copy.md/route');
const companyCard = await import('./[company]/card.png/route');
const companyCopy = await import('./[company]/copy.md/route');
const planCard = await import('./[company]/[plan]/card.png/route');
const planCopy = await import('./[company]/[plan]/copy.md/route');

/** A request as a route handler reads it: only its query. */
const request = (search: string) => ({ nextUrl: new URL(`https://example.test/x${search}`) }) as NextRequest;
const company = { params: Promise.resolve({ company: 'northwind' }) };
const plan = { params: Promise.resolve({ company: 'northwind', plan: 'senior-software-engineer' }) };

describe("Interviews' pictures and copies, as routes", () => {
  beforeEach(() => {
    vi.mocked(loadInterviewsHome).mockReset().mockResolvedValue(interviewsHome);
    vi.mocked(loadInterviewCompanyShare).mockReset().mockResolvedValue({ kind: 'live', page: northwindPage });
    vi.mocked(loadInterviewPlanShare).mockReset().mockResolvedValue({ kind: 'live', page: northwindSeniorPlan });
  });

  it('send each picture asked with another query to its versioned address, read from its own page', async () => {
    const home = await homeCard.GET(request('?v=old'));
    expect(home.headers.get('location')).toBe(`/interviews/card.png?v=${interviewsCardVersionOf(interviewsHome)}`);
    const one = await companyCard.GET(request(''), company as never);
    expect(one.headers.get('location')).toBe(`/interviews/northwind/card.png?v=${companyCardVersionOf(northwindPage)}`);
    expect(loadInterviewCompanyShare).toHaveBeenCalledWith('northwind');
    const two = await planCard.GET(request(''), plan as never);
    expect(two.headers.get('location')).toBe(
      `/interviews/northwind/senior-software-engineer/card.png?v=${planCardVersionOf(northwindSeniorPlan)}`,
    );
    expect(loadInterviewPlanShare).toHaveBeenCalledWith('northwind', 'senior-software-engineer');
  });

  it('answer each copy from its own page, the page named as the canonical', async () => {
    const home = await homeCopy.GET();
    expect(home.headers.get('link')).toBe('</interviews>; rel="canonical"');
    expect(await home.text()).toMatch(/^# Interview plans for engineers\n/);
    const one = await companyCopy.GET(new Request('https://example.test/x'), company as never);
    expect(one.headers.get('link')).toBe('</interviews/northwind>; rel="canonical"');
    expect(await one.text()).toMatch(/^# Northwind interviews\n/);
    const two = await planCopy.GET(new Request('https://example.test/x'), plan as never);
    expect(two.headers.get('link')).toBe('</interviews/northwind/senior-software-engineer>; rel="canonical"');
    expect(await two.text()).toMatch(/^# Northwind · Senior software engineer\n/);
    for (const response of [home, one, two]) {
      expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('x-robots-tag')).toBe('noindex');
    }
  });

  it("follow a moved plan to its new copy, and a missing company's to a 404", async () => {
    vi.mocked(loadInterviewPlanShare).mockResolvedValue({
      kind: 'moved',
      path: '/interviews/northwind/senior-engineer' as never,
    });
    const moved = await planCopy.GET(new Request('https://example.test/x'), plan as never);
    expect([moved.status, moved.headers.get('location')]).toEqual([308, '/interviews/northwind/senior-engineer.md']);
    vi.mocked(loadInterviewCompanyShare).mockResolvedValue({ kind: 'missing' });
    expect((await companyCopy.GET(new Request('https://example.test/x'), company as never)).status).toBe(404);
  });
});
