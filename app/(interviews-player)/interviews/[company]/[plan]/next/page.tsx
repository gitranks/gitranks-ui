import type { Metadata, Route } from 'next';
import { notFound, redirect } from 'next/navigation';

import { NextLive } from '@/components/interviews/next/next-live';
import { loadInterviewPlan } from '@/lib/interviews/plan.data';
import { loadInterviewPlanAddress } from '@/lib/interviews/plan-address.data';

/**
 * The connecting screen after a part of a plan: the plan read from its cache, the same for everyone, and the person's
 * side read in the browser. It is a person's own, so it is never indexed. A plan that moved sends the person to its
 * new page; any other address that is no live plan answers the site's not-found page. The proxy closes every
 * Interviews address to anyone Interviews is not open to.
 */
export const instant = false;

/** No plan is known when the site is built, as on the plan's own page: one address no plan can have is listed. */
export async function generateStaticParams() {
  return [{ company: '_', plan: '_' }];
}

const NOINDEX = { index: false, follow: false } as const;

export async function generateMetadata({ params }: PageProps<'/interviews/[company]/[plan]/next'>): Promise<Metadata> {
  const { company, plan: slug } = await params;
  const plan = await loadInterviewPlan(company, slug);
  return {
    title: plan ? `What comes next · ${plan.company.name} · ${plan.name}` : 'GitRanks Interviews',
    robots: NOINDEX,
  };
}

export default async function InterviewNextPage({ params }: PageProps<'/interviews/[company]/[plan]/next'>) {
  const { company, plan: slug } = await params;
  const plan = await loadInterviewPlan(company, slug);
  if (plan) return <NextLive plan={plan} />;
  const address = await loadInterviewPlanAddress(company, slug);
  if (address.state === 'moved' && address.to) redirect(address.to as Route);
  notFound();
}
