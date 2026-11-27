import type { Metadata } from 'next';

import { INTERVIEWS_OPEN_TO_EVERYONE } from './interviews-parts';
import { interviewCompanyMarkdownPath, interviewCompanyPath } from './paths';
import { companyCardTitleOf, companyCardUrlOf } from './share-card';
import { withInterviewsPreview } from './share-seo';
import type { InterviewCompanyPage } from './types';
import { pageMetadata } from '@/lib/seo/page-metadata';

/** Never indexed. */
const NOINDEX: Metadata['robots'] = { index: false, follow: false };

/**
 * A company's page for search engines and link previews: "<Company> interviews: plans for each position", its line
 * with the notice, its own address, its share picture and its Markdown copy. Not indexed while Interviews is not open
 * to everyone.
 */
export function interviewCompanyMetadata(page: Pick<InterviewCompanyPage, 'company' | 'line' | 'positions'>): Metadata {
  const { name, slug } = page.company;
  const metadata = withInterviewsPreview(
    pageMetadata({
      title: `${name} interviews: plans for each position`,
      description: `${page.line} Not an official ${name} page.`,
      path: interviewCompanyPath(slug),
    }),
    {
      picture: companyCardUrlOf(page),
      alt: companyCardTitleOf(page.company),
      markdown: interviewCompanyMarkdownPath(slug),
    },
  );
  return INTERVIEWS_OPEN_TO_EVERYONE ? metadata : { ...metadata, robots: NOINDEX };
}

/** An address that is no company's page: never indexed. */
export const INTERVIEW_COMPANY_MISSING_METADATA: Metadata = { title: 'Company not found', robots: NOINDEX };
