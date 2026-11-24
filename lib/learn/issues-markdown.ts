import {
  ISSUES_DESCRIPTION,
  ISSUES_FAILED,
  ISSUES_TITLE,
  ISSUES_UNAVAILABLE,
  type IssuesAt,
  type IssuesNames,
  type IssuesRow,
  type IssuesView,
  issuesCanonicalOf,
  issuesChipsOf,
  issuesLanguageOf,
  issuesViewOf,
  rowLessonOf,
} from './issues';
import { LESSON_MARKDOWN_HEADERS } from './lesson-markdown-response';
import { absoluteUrl } from '@/lib/seo/site';
import { ISSUE_KINDS, issueKindOf, issuePagePath, SIZE_WORDS } from '@/lib/workspace/masked-issue';

/*
 * The Markdown copy of Issues and of a lesson's and a course's view of it, for agents: the five open issues every
 * visitor sees for the view, each masked, with its lesson. The proxy answers `/learn/issues.md`,
 * `/learn/lessons/<slug>/real-world.md` and `/learn/courses/<slug>/real-world.md` from one route handler.
 */

/** The view and the page's own address a copy's query asks for, as the route handler reads it. */
export function markdownViewOf(query: URLSearchParams): { view: IssuesView; at: IssuesAt } {
  const at: IssuesAt = query.get('at') === 'lesson' ? 'lesson' : query.get('at') === 'course' ? 'course' : 'issues';
  const view = issuesViewOf(Object.fromEntries(query));
  return {
    view: { ...view, fixed: false, forYou: true, learned: false, language: issuesLanguageOf(view.language) },
    at,
  };
}

/** One masked issue as a line: its rewritten title, its facts, its lesson, and the page where it is seen in full. */
function rowLineOf(row: IssuesRow): string {
  const kind = issueKindOf(row.issue.kind);
  const facts = [
    row.issue.language,
    row.issue.size ? `${SIZE_WORDS[row.issue.size]} size` : null,
    kind ? ISSUE_KINDS[kind].toLowerCase() : null,
  ].filter(Boolean);
  const lesson = rowLessonOf(row, true);
  const parts = [
    `- **${row.issue.title}**${facts.length ? ` (${facts.join(', ')})` : ''}.`,
    lesson ? `Teaches [${lesson.title}](${absoluteUrl(lesson.href)}).` : null,
    `See it in full: ${absoluteUrl(issuePagePath(row.issue.id))}`,
  ];
  return parts.filter(Boolean).join(' ');
}

/** The copy of a view: its title, what the view narrows to, the five issues, or why there are none. */
export function learnIssuesMarkdownOf(
  view: IssuesView,
  rows: readonly IssuesRow[] | null,
  { at = 'issues', names = {} }: { at?: IssuesAt; names?: IssuesNames } = {},
): string {
  const title =
    at === 'lesson' && names.lesson
      ? `${names.lesson} in the real world`
      : at === 'course' && names.course
        ? `${names.course} in the real world`
        : ISSUES_TITLE;
  const chips = issuesChipsOf(view, names, at).map((chip) => chip.label);
  const lines = [`# ${title}`, '', ISSUES_DESCRIPTION, ''];
  if (chips.length) lines.push(`View: ${chips.join(', ')}.`, '');
  if (rows === null) lines.push(ISSUES_UNAVAILABLE.text);
  else if (!rows.length) lines.push('No open issue right now. We look for new ones every day.');
  else {
    lines.push(
      'Five open issues at a time, in the same order for everyone. Each is shown without its project; seeing one in full needs a GitHub sign-in.',
      '',
      ...rows.map(rowLineOf),
    );
  }
  lines.push('', `The page: ${absoluteUrl(issuesCanonicalOf(view, at))}`, '');
  return lines.join('\n');
}

/**
 * The copy as an answer; not found while Learn is not open to everyone, never kept then. A read that failed (not the
 * API answering none, which the copy says) answers 503, never kept either, so the next ask reads again.
 */
export async function learnIssuesMarkdownResponse(
  open: () => Promise<boolean>,
  read: () => Promise<{ rows: readonly IssuesRow[] | null; failed?: boolean; names: IssuesNames }>,
  view: IssuesView,
  at: IssuesAt,
): Promise<Response> {
  const plain = (text: string, status: number, cache = 'private, no-store') =>
    new Response(`${text}\n`, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': cache },
    });
  if (!(await open().catch(() => false))) return plain('Not found.', 404);
  const { rows, failed = false, names } = await read();
  if ((at === 'lesson' && !names.lesson) || (at === 'course' && !names.course)) return plain('Not found.', 404);
  if (failed) return plain(ISSUES_FAILED, 503, 'no-store');
  return new Response(learnIssuesMarkdownOf(view, rows, { at, names }), {
    headers: { ...LESSON_MARKDOWN_HEADERS, Link: `<${issuesCanonicalOf(view, at)}>; rel="canonical"` },
  });
}
