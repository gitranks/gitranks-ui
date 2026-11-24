import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';

import { HEADING } from '@/components/workspace/primitives';
import {
  loadAttempt,
  loadContribute,
  loadContributeSetup,
  loadIssueAttempt,
  viewerLogin,
} from '@/lib/workspace/contribute.data';
import type { ContributeAttemptDetail } from '@/lib/workspace/contribute.types';
import { isContributePageOpen } from '@/lib/workspace/contribute-state';
import { type IssueRef, pullRequestPath, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { contributeHidden } from '@/lib/workspace/setting-up';

/** The page's address, as the router reads it: the issue, and on an earlier attempt's page its id. */
export type PageParams = { owner: string; repo: string; issue: string; attemptId?: string };

/** A query as the router gives it. */
export type Query = Record<string, string | string[] | undefined>;

/**
 * The gates every page of a pull request passes: signed in, and let in. Null signed out: the workspace's layout asks
 * the visitor to sign in (the link an agent hands its person), and the page shows nothing under it.
 */
export async function gate() {
  if (!(await viewerLogin())) return null;
  const view = await loadContribute();
  if (!view) contributeHidden(await loadContributeSetup());
  if (!isContributePageOpen(view, 'attempt')) redirect('/contribute');
  return { view };
}

/** GraphQL's largest `Int`: an issue's number above it names no issue. */
const MAX_INT = 2_147_483_647;

/** What the address names, read once per request. */
type PageRead =
  /** No issue of the viewer's at this address, or an attempt id that is not an earlier one on it: a 404. */
  | { kind: 'missing' }
  /** The API did not answer. */
  | { kind: 'unread' }
  /** The repo's name changed (or its letter case, or the issue's spelling), or the "earlier" attempt is the latest. */
  | { kind: 'move'; ref: IssueRef }
  | {
      kind: 'page';
      first: ContributeAttemptDetail;
      /** The page's own address: the issue's, or the earlier attempt's under it. */
      base: Route;
      /** On an earlier attempt's page: the latest's address. */
      earlier: { latest: Route } | null;
      /** The repository and the issue, as the API names them. */
      repo: string;
      issue: number;
    };

/**
 * The viewer's first attempt the address names: the issue's newest, or with `attemptId` an older first attempt on the
 * same issue. An address in another spelling than the API's (a renamed repo, another letter case) moves to the current
 * one.
 */
export const readPage = cache(
  async (owner: string, repo: string, issue: string, earlierId?: string): Promise<PageRead> => {
    // An issue's number, in any spelling of it (`0871`), up to GraphQL's largest `Int`.
    const number = /^\d{1,10}$/.test(issue) ? Number(issue) : 0;
    if (number < 1 || number > MAX_INT) return { kind: 'missing' };
    const ref = await loadIssueAttempt(owner, repo, number);
    if (ref === undefined) return { kind: 'unread' };
    if (ref === null) return { kind: 'missing' };
    const earlier = earlierId && earlierId !== ref.attemptId ? earlierId : null;
    if (ref.repo !== `${owner}/${repo}` || issue !== String(ref.number) || (earlierId && !earlier)) {
      return { kind: 'move', ref: { repo: ref.repo, issue: ref.number, earlier } };
    }
    const first = await loadAttempt(earlier ?? ref.attemptId).catch(() => undefined);
    if (first === undefined) return { kind: 'unread' };
    if (first === null || first.kind !== 'FIRST') return { kind: 'missing' };
    if (earlier) {
      // An older first attempt on this very issue: listed by the API, or named so (its repo may have been renamed).
      const named = (first.nameWithOwner ?? '').toLowerCase();
      const same =
        first.number === ref.number &&
        (!!ref.earlier?.includes(earlier) ||
          named === ref.repo.toLowerCase() ||
          named === `${owner}/${repo}`.toLowerCase());
      if (!same) return { kind: 'missing' };
    }
    const latest = pullRequestPath({ repo: ref.repo, issue: ref.number });
    return {
      kind: 'page',
      first,
      base: earlier ? pullRequestPath({ repo: ref.repo, issue: ref.number, earlier }) : latest,
      earlier: earlier ? { latest } : null,
      repo: ref.repo,
      issue: ref.number,
    };
  },
);

/** The page the params name, or the 404. */
export async function pageOf(params: Promise<PageParams>) {
  const { owner, repo, issue, attemptId } = await params;
  const page = await readPage(owner, repo, issue, attemptId);
  if (page.kind === 'missing') notFound();
  return page;
}

/** One value of a query parameter. */
export const paramOf = (query: Query, key: string) => {
  const value = query[key];
  return (Array.isArray(value) ? value[0] : value) ?? null;
};

/** The address with the query it came with. */
export function withQuery(path: Route, query: Query): Route {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const one of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, one);
  }
  const search = params.toString();
  return (search ? `${path}?${search}` : path) as Route;
}

/**
 * The fixer's walkthrough's reads (`…/walkthrough`): the page's first attempt and its lesson. A Fix attempt's goes to
 * its page; an address in another spelling to the current one; no lesson is the 404. Null signed out (the layout asks
 * to sign in); `unread` while the API does not answer.
 */
export async function lessonPageOf(params: Promise<PageParams>) {
  const gated = await gate();
  if (!gated) return null;
  const page = await pageOf(params);
  if (page.kind === 'unread') return 'unread' as const;
  if (page.kind === 'move') redirect(`${pullRequestPath(page.ref)}/walkthrough` as Route);
  const { first, base } = page;
  if (first.mode !== 'LEARN') redirect(base);
  const { loadAttemptLesson } = await import('@/lib/learn/learn.data');
  const lesson = await loadAttemptLesson(first.attemptId).catch(() => undefined);
  if (lesson === undefined) return 'unread' as const;
  if (!lesson) notFound();
  return { view: gated.view, first, lesson, base };
}

/** The page's API did not answer: say so, with the way back to the list. */
export function Unavailable() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-3" data-review="unavailable">
      <a href={WORKSPACE_PATHS.pullRequests} className="text-sm font-semibold text-link hover:underline">
        ← Your pull requests
      </a>
      <h1 className={HEADING.page}>This page didn't load</h1>
      <p className="text-muted-foreground">Reload to try again.</p>
    </div>
  );
}
