import type { Route } from 'next';

import type { LearnCourseProject } from './course';
import { issuesCountTextOf } from './issues';
import type { LearnCodeSource } from './lesson-page';
import { languageNameOf } from '@/lib/workspace/learn-question';

/*
 * A project course's own parts, pure: the line of facts with its links, who wrote it and when it was last checked
 * against the code, which repositories an organisation's course covers, the foot for maintainers, and a quote of the
 * project's code. The page, its Markdown copy and the specs read the same words.
 */

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);

/** A course's project as the API sends it; null when it is not one (a topic or a language course has none). */
export function learnCourseProjectOf(value: unknown): LearnCourseProject | null {
  const raw = recordOf(value);
  const name = textOf(raw?.name);
  const repo = textOf(raw?.repo);
  const org = textOf(raw?.org);
  if (!raw || !name || (!repo && !org)) return null;
  return {
    name,
    repo: repo ?? null,
    org: repo ? null : org,
    language: textOf(raw.language) ?? '',
    githubUrl: textOf(raw.githubUrl) ?? `https://github.com/${repo ?? org}`,
    onGitranks: raw.onGitranks === true,
    covers: Array.isArray(raw.covers) ? raw.covers.filter((each): each is string => typeof each === 'string') : [],
    checkedAt: textOf(raw.checkedAt) ?? '',
  };
}

/** "Django’s", "Kubernetes’": a name's possessive. */
export const possessiveOf = (name: string) => (/s$/i.test(name) ? `${name}’` : `${name}’s`);

const DAY = /^(\d{4})-(\d{2})-(\d{2})/;

/** A day as the page writes it, "12 Nov 2026", from `YYYY-MM-DD` (or a full time); null for anything else. */
export function projectDayWordsOf(day: string): string | null {
  const match = DAY.exec(day);
  if (!match) return null;
  const at = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(at.getTime()) || at.getUTCDate() !== Number(match[3])) return null;
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** "Python": the project's main language, as the line of facts and the list of courses name it; null for none. */
export const projectLanguageOf = (project: Pick<LearnCourseProject, 'language'>): string | null =>
  project.language ? languageNameOf(project.language) : null;

/** "django/django on GitHub", "kubernetes on GitHub": the first link of the line of facts. */
export const projectGithubLabelOf = (project: Pick<LearnCourseProject, 'repo' | 'org'>) =>
  `${project.repo ?? project.org} on GitHub`;

/** The project's page on GitRanks: its repository's page or its organisation's. */
export function projectGitranksPathOf(project: Pick<LearnCourseProject, 'repo' | 'org'>): Route {
  if (project.repo) {
    const [owner = '', name = ''] = project.repo.split('/');
    return `/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}` as Route;
  }
  return `/org/${encodeURIComponent(project.org ?? '')}` as Route;
}

/** "Django on GitRanks": the second link of the line of facts, shown only when GitRanks has a page for the project. */
export const projectGitranksLabelOf = (project: Pick<LearnCourseProject, 'name'>) => `${project.name} on GitRanks`;

/** "9 open issues to fix", "1 open issue to fix", "1,000+ open issues to fix"; null for none (no zero is shown). */
export function projectOpenIssuesWordsOf(count: number | null | undefined): string | null {
  const shown = issuesCountTextOf(count);
  if (shown === null) return null;
  return `${shown} ${shown === '1' ? 'open issue' : 'open issues'} to fix`;
}

/**
 * Who wrote the course: "Written by GitRanks from the project's docs and code. Not an official Django course. Last
 * checked against the code on 12 Nov 2026." The last sentence is left out without a day.
 */
export function projectAuthorLineOf(project: Pick<LearnCourseProject, 'name' | 'checkedAt'>): string {
  const checked = projectDayWordsOf(project.checkedAt);
  return [
    'Written by GitRanks from the project’s docs and code.',
    `Not an official ${project.name} course.`,
    checked ? `Last checked against the code on ${checked}.` : null,
  ]
    .filter(Boolean)
    .join(' ');
}

/** "ui", "ui and core", "ui, core and docs". */
const listOf = (names: readonly string[]) =>
  names.length > 2 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join(' and ');

/**
 * Which repositories an organisation's course covers: "It covers the repository ui." or "It covers 3 repositories:
 * ui, core and docs."; null for a repository's course, and for none named.
 */
export function projectCoversLineOf(project: Pick<LearnCourseProject, 'org' | 'repo' | 'covers'>): string | null {
  if (project.repo || !project.covers.length) return null;
  if (project.covers.length === 1) return `It covers the repository ${project.covers[0]}.`;
  return `It covers ${project.covers.length} repositories: ${listOf(project.covers)}.`;
}

/** The foot's line for maintainers, a link to the page for them. */
export const projectMaintainerLineOf = (project: Pick<LearnCourseProject, 'name'>) =>
  `Do you maintain ${project.name}? Tell us what to correct, or ask us to take this course down`;

/** The foot's line on who wrote the course. */
export const PROJECT_WRITTEN_BY = 'Written by GitRanks, not by the project';

/* ------------------------------------------------------------------------------------------------------------------ */
/* A quote of the project's code                                                                                      */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The quoted lines at their exact version on GitHub: `…/blob/<commit>/<path>#L<first>-L<last>`. */
export function quoteUrlOf(source: Pick<LearnCodeSource, 'repo' | 'commit' | 'path' | 'firstLine' | 'lastLine'>) {
  const path = source.path.split('/').map(encodeURIComponent).join('/');
  const lines =
    source.firstLine === source.lastLine ? `L${source.firstLine}` : `L${source.firstLine}-L${source.lastLine}`;
  return `https://github.com/${source.repo}/blob/${source.commit}/${path}#${lines}`;
}

/** "django/core/handlers/base.py, lines 138 to 144", or "…, line 12" for one. */
export const quoteFileWordsOf = (source: Pick<LearnCodeSource, 'path' | 'firstLine' | 'lastLine'>) =>
  source.firstLine === source.lastLine
    ? `${source.path}, line ${source.firstLine}`
    : `${source.path}, lines ${source.firstLine} to ${source.lastLine}`;

/**
 * The line under a quote: "Django’s own code, as it was on 12 Nov 2026. The link opens this exact version on GitHub,
 * so it still matches the lesson after the project changes the file." The project is named by its repository when
 * its name is not known, and the day is left out without one.
 */
export function quoteLineOf(source: Pick<LearnCodeSource, 'repo' | 'at'>, project: string | null): string {
  const day = projectDayWordsOf(source.at);
  return `${possessiveOf(project ?? source.repo)} own code${day ? `, as it was on ${day}` : ''}. The link opens this exact version on GitHub, so it still matches the lesson after the project changes the file.`;
}
