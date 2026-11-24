import type { Metadata } from 'next';

import {
  ISSUES_DESCRIPTION,
  ISSUES_TITLE,
  type IssuesAt,
  type IssuesNames,
  type IssuesView,
  issuesCanonicalOf,
  issuesMarkdownPathOf,
} from '../issues';
import { learnIndexedWhile } from './course';
import { pageMetadata } from '@/lib/seo/page-metadata';

/**
 * Issues and its views: the view's own address with the switches as they are by default as the canonical, its
 * Markdown copy as an alternate. A lesson's or a course's view names it in the title. Not indexed while Learn is not
 * open to everyone, as Learn's other public pages.
 */
export function learnIssuesMetadata(
  view: IssuesView,
  { at = 'issues', names = {}, open }: { at?: IssuesAt; names?: IssuesNames; open: boolean },
): Metadata {
  const title =
    at === 'lesson' && names.lesson
      ? `${names.lesson} in the real world`
      : at === 'course' && names.course
        ? `${names.course} in the real world`
        : ISSUES_TITLE;
  const metadata = pageMetadata({ title, description: ISSUES_DESCRIPTION, path: issuesCanonicalOf(view, at) });
  return learnIndexedWhile(
    { ...metadata, alternates: { ...metadata.alternates, types: { 'text/markdown': issuesMarkdownPathOf(view, at) } } },
    open,
  );
}
