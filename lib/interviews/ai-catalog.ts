import { INTERVIEWS_HOME_MARKDOWN_PATH, interviewCompanyMarkdownPath, interviewPlanMarkdownPath } from './paths';
import type { InterviewsHome } from './types';
import { absoluteUrl } from '@/lib/seo/site';

/** One entry of the site's AI Catalog (SEP-2127): what it is, its media type, and where it is. */
export type AiCatalogEntry = { identifier: string; type: string; url: string };

/** The media type of every Interviews entry: each is a page's Markdown copy. */
const MARKDOWN = 'text/markdown';

/**
 * Interviews' entries in the site's AI Catalog: the home's Markdown copy, then each company that has a plan and each
 * of its plans, in the home's order, each by its copy. Listed only once Interviews is open to everyone (the route
 * decides); nothing of a person.
 */
export function interviewsAiCatalogEntriesOf(home: Pick<InterviewsHome, 'companies'>): AiCatalogEntry[] {
  const companies = home.companies.filter((card) => card.company?.slug && card.plans.length > 0);
  return [
    { identifier: 'urn:air:gitranks.com:interviews', type: MARKDOWN, url: absoluteUrl(INTERVIEWS_HOME_MARKDOWN_PATH) },
    ...companies.flatMap((card) => [
      {
        identifier: `urn:air:gitranks.com:interviews:${card.company.slug}`,
        type: MARKDOWN,
        url: absoluteUrl(interviewCompanyMarkdownPath(card.company.slug)),
      },
      ...card.plans.map((plan) => ({
        identifier: `urn:air:gitranks.com:interviews:${plan.company.slug}:${plan.slug}`,
        type: MARKDOWN,
        url: absoluteUrl(interviewPlanMarkdownPath(plan.company.slug, plan.slug)),
      })),
    ]),
  ];
}
