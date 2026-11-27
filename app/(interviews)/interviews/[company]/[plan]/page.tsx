import type { Metadata, Route } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { PlanGone } from '@/components/interviews/plan/plan-gone';
import { PlanLive } from '@/components/interviews/plan/plan-live';
import { loadInterviewPlan } from '@/lib/interviews/plan.data';
import { loadInterviewPlanAddress } from '@/lib/interviews/plan-address.data';
import {
  INTERVIEW_PLAN_GONE_METADATA,
  INTERVIEW_PLAN_MISSING_METADATA,
  interviewPlanMetadata,
} from '@/lib/interviews/plan-seo';

/**
 * A plan's page: the same for everyone, read from the cached plan under its tag; the person's side is read later in
 * the browser. An address that is no live plan asks where it stands: a plan that moved sends the person to its new
 * address for good, a plan taken down or removed says so, and anything else (missing, or a read that failed) answers
 * the site's not-found page, with a 404. The proxy closes every Interviews address to anyone Interviews is not open to.
 */
export const instant = false;

/**
 * No plan is known when the site is built: one address no plan can have is listed, so every real plan renders on
 * request as a whole page, and a missing one answers a real 404. Its slugs are not of a plan's shape, so building the
 * site asks the API nothing.
 */
export async function generateStaticParams() {
  return [{ company: '_', plan: '_' }];
}

export async function generateMetadata({ params }: PageProps<'/interviews/[company]/[plan]'>): Promise<Metadata> {
  const { company, plan: slug } = await params;
  const plan = await loadInterviewPlan(company, slug);
  if (plan) return interviewPlanMetadata(plan);
  const address = await loadInterviewPlanAddress(company, slug);
  return address.state === 'gone' ? INTERVIEW_PLAN_GONE_METADATA : INTERVIEW_PLAN_MISSING_METADATA;
}

export default async function InterviewPlanPage({ params }: PageProps<'/interviews/[company]/[plan]'>) {
  const { company, plan: slug } = await params;
  const plan = await loadInterviewPlan(company, slug);
  if (plan) return <PlanLive plan={plan} />;
  const address = await loadInterviewPlanAddress(company, slug);
  if (address.state === 'moved' && address.to) permanentRedirect(address.to as Route);
  if (address.state === 'gone') return <PlanGone />;
  notFound();
}
