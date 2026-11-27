import type { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { interviewsHome, LOGO_PNG_BASE64, northwindPage } from '@/lib/interviews/__fixtures__/companies';
import { northwindSeniorPlan } from '@/lib/interviews/__fixtures__/plans';

/*
 * The six routes of Interviews' pictures and copies, on the real loaders with the API stubbed: none reads who is
 * asking, so no picture or copy can show a person's plans.
 */

const { auth, graphqlDirect } = vi.hoisted(() => ({ auth: vi.fn(), graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('next/server', async (actual) => ({ ...(await actual<object>()), connection: vi.fn(async () => {}) }));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { InterviewsHomeDocument, InterviewCompanyDocument, InterviewPlanDocument } = await import(
  '@/lib/interviews/public.documents'
);
const { InterviewLogoDocument } = await import('@/lib/interviews/interviews.documents');

/** The API, as the public reads find it. */
graphqlDirect.mockImplementation(async (document: unknown) => {
  if (document === InterviewsHomeDocument) return { interviewsHome };
  if (document === InterviewCompanyDocument) return { interviewCompany: northwindPage };
  if (document === InterviewPlanDocument) return { interviewPlan: northwindSeniorPlan };
  if (document === InterviewLogoDocument) return { interviewLogo: LOGO_PNG_BASE64 };
  throw new Error('not a public read');
});

const homeCard = await import('./card.png/route');
const homeCopy = await import('./copy.md/route');
const companyCard = await import('./[company]/card.png/route');
const companyCopy = await import('./[company]/copy.md/route');
const planCard = await import('./[company]/[plan]/card.png/route');
const planCopy = await import('./[company]/[plan]/copy.md/route');
const { companyCardVersionOf, interviewsCardVersionOf, planCardVersionOf } = await import(
  '@/lib/interviews/share-card'
);

const request = (search: string) => ({ nextUrl: new URL(`https://example.test/x${search}`) }) as NextRequest;
const company = { params: Promise.resolve({ company: 'northwind' }) } as never;
const plan = { params: Promise.resolve({ company: 'northwind', plan: 'senior-software-engineer' }) } as never;
const asked = new Request('https://example.test/x');

describe("Interviews' pictures and copies, on the public reads", () => {
  it('draw and write each one without ever asking who is asking', async () => {
    const answers = [
      await homeCard.GET(request(`?v=${interviewsCardVersionOf(interviewsHome)}`)),
      await companyCard.GET(request(`?v=${companyCardVersionOf(northwindPage)}`), company),
      await planCard.GET(request(`?v=${planCardVersionOf(northwindSeniorPlan)}`), plan),
      await homeCopy.GET(),
      await companyCopy.GET(asked, company),
      await planCopy.GET(asked, plan),
    ];
    expect(answers.map((answer) => answer.status)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(auth).not.toHaveBeenCalled();
    for (const [, , params] of graphqlDirect.mock.calls) {
      expect(params).toEqual({ source: 'ssr' });
    }
  }, 60_000);
});
