import type { Metadata } from 'next';

import { INTERVIEWS_OPEN_TO_EVERYONE } from './interviews-parts';
import { interviewPlanMarkdownPath, interviewPlanPath } from './paths';
import { planCardTitleOf, planCardUrlOf } from './share-card';
import { withInterviewsPreview } from './share-seo';
import type { InterviewPlanPage } from './types';
import { pageMetadata } from '@/lib/seo/page-metadata';

/** Never indexed while Interviews is not open to everyone. */
const NOT_INDEXED = { index: false, follow: false } as const;

/**
 * A plan's page for search engines and link previews, in the words of the share pictures: "Northwind · Senior
 * software engineer: an interview plan", and the plan's line with the notice that the page is not official. Not
 * indexed while Interviews is not open to everyone. Its share picture and its Markdown copy go with it.
 */
export function interviewPlanMetadata(
  plan: Pick<InterviewPlanPage, 'company' | 'slug' | 'name' | 'line' | 'rounds'>,
  openToEveryone = INTERVIEWS_OPEN_TO_EVERYONE,
): Metadata {
  const metadata = withInterviewsPreview(
    pageMetadata({
      title: `${plan.company.name} · ${plan.name}: an interview plan`,
      description: `${plan.line} Not an official ${plan.company.name} page.`,
      path: interviewPlanPath(plan.company.slug, plan.slug),
    }),
    {
      picture: planCardUrlOf(plan),
      alt: planCardTitleOf(plan),
      markdown: interviewPlanMarkdownPath(plan.company.slug, plan.slug),
    },
  );
  return openToEveryone ? metadata : { ...metadata, robots: NOT_INDEXED };
}

/** An address that is no plan's, or a plan no longer there: never indexed. */
export const INTERVIEW_PLAN_MISSING_METADATA: Metadata = {
  title: 'Plan not found',
  robots: NOT_INDEXED,
};

/** A plan taken down or removed: never indexed. */
export const INTERVIEW_PLAN_GONE_METADATA: Metadata = {
  title: 'This plan is no longer here',
  robots: NOT_INDEXED,
};
