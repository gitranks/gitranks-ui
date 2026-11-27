import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { CompanyLive } from '@/components/interviews/company/company-live';
import { movedPathOf } from '@/lib/interviews/address';
import { loadInterviewAddress } from '@/lib/interviews/address.data';
import { loadInterviewCompany } from '@/lib/interviews/company.data';
import { INTERVIEW_COMPANY_MISSING_METADATA, interviewCompanyMetadata } from '@/lib/interviews/company-seo';

/**
 * A company's page: the same for everyone, read from the cached company under its tag; the person's plans there are
 * read later in the browser. An address that is no live company asks where it stands: a moved one is sent to its new
 * address, and a company taken down, removed or never there answers the site's not-found page, with a 404. The proxy
 * closes every Interviews address to anyone Interviews is not open to.
 */
export const instant = false;

/**
 * No company is known when the site is built: one address no company can have is listed, so every real company
 * renders on request as a whole page before the response starts, with no shell, and a missing one answers a real 404
 * (a moved one a real redirect). Its slug is not of a company's shape, so building the site asks the API nothing.
 */
export async function generateStaticParams() {
  return [{ company: '_' }];
}

export async function generateMetadata({ params }: PageProps<'/interviews/[company]'>): Promise<Metadata> {
  const { company: slug } = await params;
  const page = await loadInterviewCompany(slug);
  return page ? interviewCompanyMetadata(page) : INTERVIEW_COMPANY_MISSING_METADATA;
}

export default async function InterviewCompanyPage({ params }: PageProps<'/interviews/[company]'>) {
  const { company: slug } = await params;
  const page = await loadInterviewCompany(slug);
  if (page) return <CompanyLive page={page} />;
  const moved = movedPathOf(await loadInterviewAddress(slug, null));
  if (moved) permanentRedirect(moved);
  notFound();
}
