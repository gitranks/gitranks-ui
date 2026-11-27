import type { MetadataRoute } from 'next';

import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import {
  INTERVIEWS_ABOUT_PATH,
  INTERVIEWS_HOME_PATH,
  interviewCompanyPath,
  interviewPlanPath,
} from '@/lib/interviews/paths';
import type { InterviewsHome } from '@/lib/interviews/types';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/**
 * GitRanks Interviews' pages for search engines: the home and How it works, every listed company (each has a plan),
 * and every plan of each, from the home read. Nothing at all while Interviews is not open to everyone; nothing of a
 * person ever (My interviews and the connecting screen are never indexed). With no company read, the two pages alone.
 */
export function interviewsSitemapEntries(
  home: Pick<InterviewsHome, 'companies'> | null,
  openToEveryone = INTERVIEWS_OPEN_TO_EVERYONE,
): MetadataRoute.Sitemap {
  if (!openToEveryone) return [];
  const companies = (home?.companies ?? []).filter((card) => card.company?.slug && card.plans.length > 0);
  return [
    sitemapEntry(INTERVIEWS_HOME_PATH, { priority: 0.7 }),
    sitemapEntry(INTERVIEWS_ABOUT_PATH, { priority: 0.5 }),
    ...companies.flatMap((card) => [
      sitemapEntry(interviewCompanyPath(card.company.slug), { priority: 0.7 }),
      ...card.plans.map((plan) => sitemapEntry(interviewPlanPath(plan.company.slug, plan.slug), { priority: 0.6 })),
    ]),
  ];
}

/** Text safe inside an XML element. */
const xmlText = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** The entries as a sitemap file, as Next writes one for a `sitemap.ts`. */
export function interviewsSitemapXmlOf(entries: MetadataRoute.Sitemap): string {
  const urls = entries.map((entry) =>
    [
      '<url>',
      `<loc>${xmlText(entry.url)}</loc>`,
      entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : '',
      entry.priority === undefined ? '' : `<priority>${entry.priority}</priority>`,
      '</url>',
    ].join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}
