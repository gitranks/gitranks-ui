import 'server-only';

import { loadInterviewAddress } from './address.data';
import { loadInterviewCompany } from './company.data';
import { loadInterviewLogo } from './logo.data';
import type { InterviewLogoFileSize } from './paths';
import { loadInterviewPlan } from './plan.data';
import { loadInterviewPlanAddress } from './plan-address.data';
import { type InterviewShareState, interviewShareStateOf } from './share';
import type { InterviewCompanyPage, InterviewCompanyRef, InterviewPlanPage } from './types';

/*
 * What the share pictures and the Markdown copies read: the same cached public reads the pages read, never a session.
 */

/** A company's page as its picture and its copy find it; its address is asked only when the page is not live. */
export async function loadInterviewCompanyShare(company: string): Promise<InterviewShareState<InterviewCompanyPage>> {
  const page = await loadInterviewCompany(company);
  if (page) return { kind: 'live', page };
  return interviewShareStateOf<InterviewCompanyPage>(null, await loadInterviewAddress(company, null));
}

/** A plan's page as its picture and its copy find it; its address is asked only when the page is not live. */
export async function loadInterviewPlanShare(
  company: string,
  plan: string,
): Promise<InterviewShareState<InterviewPlanPage>> {
  const page = await loadInterviewPlan(company, plan);
  if (page) return { kind: 'live', page };
  return interviewShareStateOf<InterviewPlanPage>(null, await loadInterviewPlanAddress(company, plan));
}

/**
 * The logo files a picture draws, by company slug, as base64 PNG: null for a company with no logo (its letter is
 * drawn). Only a company the read says has a logo is asked.
 */
export async function loadCardLogos(
  companies: readonly InterviewCompanyRef[],
  size: InterviewLogoFileSize,
): Promise<Map<string, string | null>> {
  const logos = await Promise.all(
    companies.map(async (company) => [company.slug, company.logo ? await loadInterviewLogo(company.slug, size) : null]),
  );
  return new Map(logos as [string, string | null][]);
}
