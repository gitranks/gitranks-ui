import type { Metadata } from 'next';

import {
  ISSUES_DESCRIPTION,
  ISSUES_TITLE,
  type IssuesAt,
  type IssuesNames,
  type IssuesView,
  isOwnView,
  issuesCanonicalOf,
  issuesMarkdownPathOf,
} from '../issues';
import { realProjectsTitleOf, realProjectsWordsOf } from '../real-projects';
import { pageMetadata } from '@/lib/seo/page-metadata';

/** A view no search engine keeps: the open issues it holds are hidden, so it has nothing to read. Its links count. */
const NOT_INDEXED = { index: false, follow: true } as const;

/**
 * Issues and its views: the view's own address with the switches as they are by default as the canonical, its
 * Markdown copy as an alternate. A lesson's or a course's own view is titled "[its name]: in real projects", points
 * every variant to its bare address, and is indexed only while it has a merged fix (`fixed`: whether it has one, null
 * when that could not be read, which keeps it indexed as it was).
 */
export function learnIssuesMetadata(
  view: IssuesView,
  { at = 'issues', names = {}, fixed = null }: { at?: IssuesAt; names?: IssuesNames; fixed?: boolean | null } = {},
): Metadata {
  const own = at !== 'issues' && isOwnView(view, at);
  const name = at === 'lesson' ? names.lesson : at === 'course' ? names.course : null;
  const title = own && name ? realProjectsTitleOf(name) : ISSUES_TITLE;
  const description = at !== 'issues' && own ? realProjectsWordsOf(at).sentence : ISSUES_DESCRIPTION;
  const metadata = pageMetadata({ title, description, path: issuesCanonicalOf(view, at) });
  return {
    ...metadata,
    alternates: { ...metadata.alternates, types: { 'text/markdown': issuesMarkdownPathOf(view, at) } },
    ...(own && fixed === false ? { robots: NOT_INDEXED } : {}),
  };
}
