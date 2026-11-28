import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { SKILLS_LOGINS_TAG, skillsTag } from './paths';
import {
  MarkSkillsSeenDocument,
  SetSkillsHiddenBeforeBuildDocument,
  SetSkillsHiddenDocument,
  SkillsBriefDocument,
  SkillsFixesDocument,
  SkillsLoginsDocument,
  SkillsMineBeforeBuildDocument,
  SkillsMineDocument,
  SkillsPageBeforeBuildDocument,
  SkillsPageDocument,
  SkillsTabDocument,
} from './skills.documents';
import type { SkillsBrief, SkillsFixes, SkillsMine, SkillsPage, SkillsState } from './skills.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The Skills reads. The public ones are the same for everyone, read signed out and kept fifteen minutes under the
 * login's tag (`skills:<login>`), which the owner's "Hide this page" expires at once. Each catches inside its own cached
 * function, so a failed read never fails a page rendered ahead of a request: it is kept for minutes and says it failed.
 * The owner's reads are never kept.
 */

/** An error the API gives for a field it does not know. */
const UNKNOWN_FIELD = /Cannot query field|Unknown type/i;

/** The fallback to today's documents is said once a server, not once a read. */
let saidBefore = false;

/**
 * Asks `document`, and `before` (the same without Build's fields) when the API does not know a field of the first:
 * an API not yet serving Build's fields still answers the page. Any other failure is thrown as it came.
 */
async function askWithBuild<TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  before: DocumentNode<TData, TVariables>,
  variables: TVariables,
  params: Parameters<typeof graphqlDirect>[2],
): Promise<TData> {
  try {
    return await graphqlDirect(document, variables, params);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!UNKNOWN_FIELD.test(message)) throw error;
    if (!saidBefore) {
      saidBefore = true;
      console.warn(`Skills read without Build's fields: the API does not know them (${message.slice(0, 200)})`);
    }
    return graphqlDirect(before, variables, params);
  }
}

/**
 * A page as the site keeps it: the Built rows when there are some, else no `built` key at all, so a page with nothing
 * of Build is the same data as before Build (the public page hands it to the browser whole).
 */
function withBuiltOf(page: SkillsPage): SkillsPage {
  const { built, ...rest } = page;
  return built?.length ? page : rest;
}

/** The owner's view with Build's fields: no Built row and no build when the answer had none. */
const mineWithBuildOf = (mine: SkillsMine): SkillsMine => ({
  ...mine,
  page: mine.page ? withBuiltOf(mine.page) : null,
  usesBuild: mine.usesBuild ?? false,
});

/**
 * Fifteen minutes fresh, as the API keeps its own answers. An answer of no page is read again after a minute
 * (`'minutes'`): a page that comes into being (a builder's, once Build opens to everyone) shows soon, not a day later.
 */
const SKILLS_LIFE = { stale: 300, revalidate: 900, expire: 86_400 };

/** A public read: its answer (null when there is no public page), or `failed` when the API could not be read. */
export type SkillsRead<T> = { value: T | null; failed: boolean };

/** A person's public page. */
export async function loadSkillsPage(login: string): Promise<SkillsRead<SkillsPage>> {
  'use cache';
  cacheTag(skillsTag(login));
  try {
    const { skillsPage } = await askWithBuild(
      SkillsPageDocument,
      SkillsPageBeforeBuildDocument,
      { login },
      {
        source: 'ssr',
      },
    );
    if (skillsPage) cacheLife(SKILLS_LIFE);
    else cacheLife('minutes');
    return { value: skillsPage ? withBuiltOf(skillsPage) : null, failed: false };
  } catch {
    cacheLife('minutes');
    return { value: null, failed: true };
  }
}

/** A person's numbers alone, for the tab and the profile's block. */
export async function loadSkillsBrief(login: string): Promise<SkillsRead<SkillsBrief>> {
  'use cache';
  cacheTag(skillsTag(login));
  try {
    const { skillsBrief } = await graphqlDirect(SkillsBriefDocument, { login }, { source: 'client' });
    if (skillsBrief) cacheLife(SKILLS_LIFE);
    else cacheLife('minutes');
    return { value: skillsBrief ?? null, failed: false };
  } catch {
    cacheLife('minutes');
    return { value: null, failed: true };
  }
}

/** The fixes of a public page after a cursor. */
export async function loadSkillsFixes(login: string, after: string): Promise<SkillsRead<SkillsFixes>> {
  'use cache';
  cacheTag(skillsTag(login));
  try {
    const { skillsFixes } = await graphqlDirect(SkillsFixesDocument, { login, after }, { source: 'client' });
    cacheLife(SKILLS_LIFE);
    return { value: skillsFixes ?? null, failed: false };
  } catch {
    cacheLife('minutes');
    return { value: null, failed: true };
  }
}

/** The most pages of logins the sitemap reads: 50,000 pages, far above the people who have one. */
export const SKILLS_LOGIN_PAGES = 50;

/** Every login whose page search engines may index, for the sitemap; null when they cannot all be read. */
export async function loadSkillsLogins(): Promise<string[] | null> {
  'use cache';
  cacheTag(SKILLS_LOGINS_TAG);
  const logins: string[] = [];
  let after: string | null = null;
  try {
    for (let page = 0; page < SKILLS_LOGIN_PAGES; page += 1) {
      const { skillsLogins }: { skillsLogins: { logins: string[]; next: string | null } } = await graphqlDirect(
        SkillsLoginsDocument,
        { after },
        { source: 'ssr' },
      );
      logins.push(...skillsLogins.logins);
      after = skillsLogins.next;
      if (!after) break;
    }
  } catch {
    cacheLife('minutes');
    return null;
  }
  // An empty list (no page indexable yet) is asked again within minutes, so the first one reaches it soon.
  if (logins.length) cacheLife('hours');
  else cacheLife('minutes');
  return logins;
}

/** The viewer's own view of their page: null signed out, `undefined` when it could not be read. */
export async function loadSkillsMine(githubLogin: string): Promise<SkillsMine | null | undefined> {
  try {
    const { skillsMine } = await askWithBuild(
      SkillsMineDocument,
      SkillsMineBeforeBuildDocument,
      {},
      { source: 'client', githubLogin },
    );
    return skillsMine ? mineWithBuildOf(skillsMine) : null;
  } catch {
    return undefined;
  }
}

/** What the viewer's tab needs; null when it cannot be read or there is no viewer. */
export async function loadSkillsTab(githubLogin: string): Promise<{ state: SkillsState; tabNew: boolean } | null> {
  try {
    const { skillsMine } = await graphqlDirect(SkillsTabDocument, {}, { source: 'client', githubLogin });
    return skillsMine ?? null;
  } catch {
    return null;
  }
}

/** The owner opened their tab: whether the API marked it (false with no row to mark, or on a failure). */
export async function markSkillsSeen(githubLogin: string): Promise<boolean> {
  try {
    const { markSkillsSeen: marked } = await graphqlDirect(
      MarkSkillsSeenDocument,
      {},
      { source: 'client', githubLogin },
    );
    return marked === true;
  } catch {
    return false;
  }
}

/** Hides the viewer's page or shows it again: the owner's view after it; null with nothing to show; throws on a failure. */
export async function setSkillsHidden(githubLogin: string, hidden: boolean): Promise<SkillsMine | null> {
  const { setSkillsHidden: mine } = await askWithBuild(
    SetSkillsHiddenDocument,
    SetSkillsHiddenBeforeBuildDocument,
    { hidden },
    { source: 'client', githubLogin },
  );
  return mine ? mineWithBuildOf(mine) : null;
}
