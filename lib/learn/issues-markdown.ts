import {
  ISSUES_DESCRIPTION,
  ISSUES_FAILED,
  ISSUES_TITLE,
  ISSUES_UNAVAILABLE,
  type IssuesAt,
  type IssuesNames,
  type IssuesRow,
  type IssuesView,
  isOwnView,
  issuesCanonicalOf,
  issuesChipsOf,
  issuesLanguageOf,
  issuesViewOf,
  type LearnFixes,
  type LearnFixRow,
  mergedOnOf,
  rowLessonOf,
} from './issues';
import { LESSON_MARKDOWN_HEADERS } from './lesson-markdown-response';
import { learnFixPath } from './paths';
import { fixesCountLineOf, fixLanguageWordsOf, realProjectsTitleOf, realProjectsWordsOf } from './real-projects';
import { absoluteUrl } from '@/lib/seo/site';
import { ISSUE_KINDS, issueKindOf, issuePageHrefOf, SIZE_WORDS } from '@/lib/workspace/masked-issue';

/*
 * The Markdown copy of Issues and of a lesson's and a course's view of it, for agents: the five open issues every
 * visitor sees for the view, each masked, with its lesson; a lesson's or a course's own view adds the merged fixes that
 * used it, in the two groups its page shows. The proxy answers `/learn/issues.md`,
 * `/learn/lessons/<slug>/real-world.md` and `/learn/courses/<slug>/real-world.md` from one route handler.
 */

/** The view and the page's own address a copy's query asks for, as the route handler reads it. */
export function markdownViewOf(query: URLSearchParams): { view: IssuesView; at: IssuesAt } {
  const at: IssuesAt = query.get('at') === 'lesson' ? 'lesson' : query.get('at') === 'course' ? 'course' : 'issues';
  const view = issuesViewOf(Object.fromEntries(query));
  const own = at !== 'issues' && isOwnView(view, at);
  return {
    view: {
      ...view,
      show: own ? 'both' : 'open',
      forYou: true,
      learned: false,
      language: issuesLanguageOf(view.language),
    },
    at,
  };
}

/**
 * One masked issue as a line: its rewritten title, its facts, its lesson (left out on a lesson's own view, which is
 * the lesson's), and the page where it is seen in full.
 */
function rowLineOf(row: IssuesRow, lessonLine: boolean): string {
  const kind = issueKindOf(row.issue.kind);
  const facts = [
    row.issue.language,
    row.issue.size ? `${SIZE_WORDS[row.issue.size]} size` : null,
    kind ? ISSUE_KINDS[kind].toLowerCase() : null,
  ].filter(Boolean);
  const lesson = lessonLine ? rowLessonOf(row, true) : null;
  const parts = [
    `- **${row.issue.title}**${facts.length ? ` (${facts.join(', ')})` : ''}.`,
    lesson ? `Teaches [${lesson.title}](${absoluteUrl(lesson.href)}).` : null,
    `See it in full: ${absoluteUrl(issuePageHrefOf(row.issue.id, 'learn'))}`,
  ];
  return parts.filter(Boolean).join(' ');
}

/** A merged fix as a line: its title, its project and numbers, its language when known, who fixed it and when, links. */
function fixLineOf(fix: LearnFixRow): string {
  const facts = [fix.repo, `issue #${fix.issueNumber}`, `pull request #${fix.number}`, fixLanguageWordsOf(fix)].filter(
    Boolean,
  );
  const merged = mergedOnOf(fix.mergedAt);
  return [
    `- **${fix.title}** (${facts.join(', ')}).`,
    `Fixed by ${fix.fixer}${merged ? `, ${merged}` : ''}.`,
    `The fix: ${absoluteUrl(learnFixPath({ nameWithOwner: fix.repo, number: fix.number }))}`,
    `On GitHub: ${fix.url}`,
  ].join(' ');
}

const FIVE_MASKED =
  'Five open issues at a time, in the same order for everyone. Each is shown without its project; seeing one in full needs a GitHub sign-in.';
const FIVE_NAMED =
  'Five open issues at a time, in the same order for everyone. Each is shown with a rewritten title; seeing one in full needs a GitHub sign-in.';

/** The open issues' lines: the five, or why there are none. */
function openLinesOf(view: IssuesView, rows: readonly IssuesRow[] | null, none: string, lessonLine: boolean): string[] {
  if (rows === null) return [ISSUES_UNAVAILABLE.text];
  if (!rows.length) return [none];
  return [view.repo || view.org ? FIVE_NAMED : FIVE_MASKED, '', ...rows.map((row) => rowLineOf(row, lessonLine))];
}

/** The merged fixes' lines: the first ten, with the count when there are more; or why there are none. */
function fixesLinesOf(fixes: LearnFixes | null, none: { title: string; text: string }): string[] {
  if (fixes === null) return ['The merged fixes are not available right now.'];
  if (!fixes.rows.length) return [`${none.title}. ${none.text}`];
  const count = fixesCountLineOf(fixes.rows.length, fixes.total);
  return [...fixes.rows.map(fixLineOf), ...(count ? ['', `${count}.`] : [])];
}

/**
 * The copy of a view: its title, what the view narrows to, the five issues, or why there are none. A lesson's or a
 * course's own view (`fixes` given) is titled as its page is, says what it holds, and lists "Open" then "Fixed".
 */
export function learnIssuesMarkdownOf(
  view: IssuesView,
  rows: readonly IssuesRow[] | null,
  { at = 'issues', names = {}, fixes }: { at?: IssuesAt; names?: IssuesNames; fixes?: LearnFixes | null } = {},
): string {
  const page = `The page: ${absoluteUrl(issuesCanonicalOf(view, at))}`;
  const name = at === 'lesson' ? names.lesson : at === 'course' ? names.course : null;
  if (at !== 'issues' && fixes !== undefined && name) {
    const words = realProjectsWordsOf(at);
    return [
      `# ${realProjectsTitleOf(name)}`,
      '',
      words.sentence,
      '',
      '## Open',
      '',
      ...openLinesOf(view, rows, `${words.openNone.title}. ${words.openNone.text}`, at !== 'lesson'),
      '',
      '## Fixed',
      '',
      ...fixesLinesOf(fixes, words.fixedNone),
      '',
      page,
      '',
    ].join('\n');
  }
  const chips = issuesChipsOf(view, names, at).map((chip) => chip.label);
  const lines = [`# ${ISSUES_TITLE}`, '', ISSUES_DESCRIPTION, ''];
  if (chips.length) lines.push(`View: ${chips.join(', ')}.`, '');
  lines.push(...openLinesOf(view, rows, 'No open issue right now. We look for new ones every day.', true));
  lines.push('', page, '');
  return lines.join('\n');
}

/** What a copy reads: the five (null when the API answers none), a failure, the names, and a view's own fixes. */
export type IssuesMarkdownRead = {
  rows: readonly IssuesRow[] | null;
  failed?: boolean;
  names: IssuesNames;
  /** A lesson's or a course's own view: its merged fixes, null when the API answers none. */
  fixes?: LearnFixes | null;
};

/**
 * The copy as an answer; not found for a lesson or a course that is not one, never kept. A read that failed (not the
 * API answering none, which the copy says) answers 503, never kept either, so the next ask reads again.
 */
export async function learnIssuesMarkdownResponse(
  read: () => Promise<IssuesMarkdownRead>,
  view: IssuesView,
  at: IssuesAt,
): Promise<Response> {
  const plain = (text: string, status: number, cache = 'private, no-store') =>
    new Response(`${text}\n`, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': cache },
    });
  const { rows, failed = false, names, fixes } = await read();
  if ((at === 'lesson' && !names.lesson) || (at === 'course' && !names.course)) return plain('Not found.', 404);
  if (failed) return plain(ISSUES_FAILED, 503, 'no-store');
  return new Response(learnIssuesMarkdownOf(view, rows, { at, names, fixes }), {
    headers: { ...LESSON_MARKDOWN_HEADERS, Link: `<${issuesCanonicalOf(view, at)}>; rel="canonical"` },
  });
}
