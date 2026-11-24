import type { Route } from 'next';

import {
  LEARN_ISSUES_PATH,
  LEARN_PULL_REQUESTS_PATH,
  learnFixAnswersPath,
  learnFixPath,
  learnLessonPath,
} from '@/lib/learn/paths';
import { githubUrlOf } from '@/lib/workspace/attempt-format';
import {
  PICK_ISSUE_PATHS,
  pullRequestApprovePath,
  pullRequestWalkthroughPath,
  WORKSPACE_PATHS,
} from '@/lib/workspace/paths';
import type { PullRequestLinks } from '@/lib/workspace/pull-request-page';
import type { PullRequestPage } from '@/lib/workspace/pull-request-page.types';
import { sitePathOf } from '@/lib/workspace/pull-request-read';

/**
 * The addresses a pull request's page gives its parts, from the page's read. `latest`: the issue's newest attempt
 * (an earlier attempt's page has no walkthrough or Approve of its own); `login`: the person, whose answers the
 * walkthrough's card links once the pull request is open.
 */
export function pullRequestLinksOf(
  page: PullRequestPage,
  { latest, login }: { latest: boolean; login: string | null },
): PullRequestLinks {
  const learn = page.made === 'LEARN';
  const ref = { repo: page.repo, issue: page.issueNumber };
  const pr = page.number !== null ? { nameWithOwner: page.repo, number: page.number } : null;
  const github = githubUrlOf(page.url);
  const approving = latest && page.box === 'APPROVE';
  const ways = learn ? page.waysOn : null;
  const way = (value: string | null | undefined) => (sitePathOf(value) as Route | null) ?? null;
  const issues = learn ? LEARN_ISSUES_PATH : PICK_ISSUE_PATHS.fix;
  return {
    back: learn ? LEARN_PULL_REQUESTS_PATH : WORKSPACE_PATHS.pullRequests,
    walkthrough: learn && latest && page.number === null ? pullRequestWalkthroughPath(ref) : null,
    approve: latest ? pullRequestApprovePath(ref) : null,
    // Before the pull request, the change is read on Approve; after, on GitHub.
    change: approving ? pullRequestApprovePath(ref) : github && pr ? (`${github}/files` as Route) : null,
    answers: learn
      ? pr && login
        ? learnFixAnswersPath(pr, login)
        : latest
          ? pullRequestWalkthroughPath(ref)
          : null
      : null,
    lesson: page.lesson ? learnLessonPath(page.lesson.slug) : null,
    lessonQuestions: way(ways?.lessonQuestions),
    lessonIssues: way(ways?.lessonIssues),
    course: way(ways?.course),
    similar: issues,
    issues,
    // Contribute: the pull request's text, on Approve before it is sent, on GitHub after.
    pullRequestText: learn ? null : approving ? pullRequestApprovePath(ref) : (github as Route | null),
  };
}

/** The fix's public page, once its pull request is open: Learn's only, as a full address to copy. */
export function fixPageUrlOf(page: PullRequestPage, origin: string): string | null {
  if (page.made !== 'LEARN' || page.number === null || (page.box !== 'OPEN' && page.box !== 'MERGED')) return null;
  return `${origin}${learnFixPath({ nameWithOwner: page.repo, number: page.number })}`;
}
