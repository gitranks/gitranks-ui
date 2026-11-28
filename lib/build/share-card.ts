import type { Route } from 'next';

import { durationWordsOf } from './duration';
import { BUILD_HOME_PATH, buildProjectPath, buildStepPath } from './paths';
import { dayYearOf, languageNameOf, languagesWordsOf, stepsWordsOf } from './project';
import { type BuildProjectPage, type BuildStepPage, isBuildLanguage } from './types';

/*
 * Build's four share pictures, as the approved designs draw them: a project a person built, a project, a step and
 * Build's home. What each says, where each lives and its version. Pure and free of server reads, so the pictures, the
 * metadata and the design catalogue use the same rules. No picture shows a zero or an avatar.
 */

/** A short, stable hash of a text (32-bit FNV-1a), in base 36. */
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** The file name of a picture, beside its page. */
const CARD_FILE = 'card.png';

/** Build home's picture. */
export const BUILD_HOME_CARD_PATH = `${BUILD_HOME_PATH}/${CARD_FILE}` as Route;
/** A project's picture; with `?by=<login>`, the picture of that person's build of it. */
export const buildProjectCardPath = (project: string) => `${buildProjectPath(project)}/${CARD_FILE}` as Route;
/** A step's picture. */
export const buildStepCardPath = (project: string, step: string) =>
  `${buildStepPath(project, step)}/${CARD_FILE}` as Route;

/** The address a picture prints: the page, without the scheme. */
const addressOf = (path: string) => `gitranks.com${path}`;

/** The words of one picture: its label, its title (with the person's login first, in violet), its lines, its address. */
export type BuildCardWords = {
  eyebrow: string;
  /** The label in the colour of a build that is done. */
  built: boolean;
  login: string | null;
  title: string;
  lines: string[];
  address: string;
};

/** The title's size: smaller in two steps for a long title, so it keeps to two lines. */
export const buildCardTitleSize = (title: string) => (title.length > 48 ? 46 : title.length > 32 ? 54 : 62);

/** A line as a picture draws it: no full stop at its end. */
const lineOf = (text: string) => text.trim().replace(/\.$/, '');

/* ------------------------------------------------------------------------------------------------------------------ */
/* A project a person built                                                                                           */
/* ------------------------------------------------------------------------------------------------------------------ */

/**
 * A project a person built, as their public Skills page lists it: what it builds as a sentence names it ("an MCP
 * server"), the languages built (the first built first), the most steps a build of it passed, when it was first built,
 * and whether the gold test was passed.
 */
export type BuildSharedRow = {
  project: string;
  thing: string;
  languages: string[];
  steps: number;
  builtAt: string;
  gold: boolean;
};

/** The Built row of a person's public Skills page for one project, when they built it; null otherwise. */
export const builtRowFor = (
  built: readonly BuildSharedRow[] | null | undefined,
  project: string,
): BuildSharedRow | null => built?.find((row) => row.project === project) ?? null;

/** The languages a project was built in, as a sentence names them: "TypeScript", "TypeScript and Python". */
function builtLanguagesOf(languages: readonly string[]): string | null {
  const names = languages.filter(isBuildLanguage).map(languageNameOf);
  if (!names.length) return null;
  return names.length === 1 ? (names[0] ?? null) : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** What a project a person built draws. */
type PersonCardProject = Pick<BuildProjectPage, 'slug' | 'thing' | 'baseSteps'>;

/**
 * A person's build: "@octocat built an MCP server", how it was built, when, and the gold mark only when it was earned.
 * The steps are the most a build of it passed, else the base's.
 */
export function personCardOf(project: PersonCardProject, login: string, row: BuildSharedRow): BuildCardWords {
  const steps = row.steps > 0 ? row.steps : project.baseSteps;
  const languages = builtLanguagesOf(row.languages);
  const how = [languages ? `In ${languages}` : null, steps > 0 ? `in ${steps} ${steps === 1 ? 'step' : 'steps'}` : null]
    .filter(Boolean)
    .join(', ');
  const made = how ? `${how}, with their own AI agent` : 'With their own AI agent';
  return {
    eyebrow: 'Built',
    built: true,
    login,
    title: `built ${row.thing || project.thing}`,
    lines: [
      made.charAt(0).toUpperCase() + made.slice(1),
      `Built on ${dayYearOf(row.builtAt)}${row.gold ? ' · Repeated after a week' : ''}`,
    ],
    address: addressOf(buildProjectPath(project.slug)),
  };
}

/** A person's build's preview: its title and description. */
export const personPreviewOf = (project: PersonCardProject, login: string, row: BuildSharedRow) => ({
  title: `${login} built ${row.thing || project.thing} · GitRanks Build`,
  description: row.gold
    ? 'Built step by step with their own AI agent, and repeated a week later. Build one yourself.'
    : 'Built step by step with their own AI agent. Build one yourself.',
});

/** A person's build's picture's version: a hash of what it draws. */
export const personCardVersionOf = (project: PersonCardProject, login: string, row: BuildSharedRow) => {
  const words = personCardOf(project, login, row);
  return hashOf(['person', login.toLowerCase(), words.title, ...words.lines, words.address].join('\n'));
};

/** The query of a person's build's picture: whose build, then the version. */
export const personCardQueryOf = (login: string, version: string) => `?by=${encodeURIComponent(login)}&v=${version}`;

/** A person's build's picture, under its one current address. */
export const personCardUrlOf = (project: PersonCardProject, login: string, row: BuildSharedRow) =>
  `${buildProjectCardPath(project.slug)}${personCardQueryOf(login, personCardVersionOf(project, login, row))}`;

/* ------------------------------------------------------------------------------------------------------------------ */
/* A project                                                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

/** What a project's picture draws. */
type ProjectCardProject = Pick<BuildProjectPage, 'slug' | 'name' | 'line' | 'baseSteps' | 'minutes' | 'languages'>;

/** A project: its name, its line, and its facts ("16 steps · about an hour and a half · TypeScript or Python"). */
export function projectCardOf(project: ProjectCardProject): BuildCardWords {
  const facts = [
    stepsWordsOf(project.baseSteps),
    durationWordsOf(project.minutes),
    languagesWordsOf(project.languages),
  ].filter(Boolean);
  return {
    eyebrow: 'Build',
    built: false,
    login: null,
    title: project.name,
    lines: [lineOf(project.line), facts.join(' · ')].filter(Boolean),
    address: addressOf(buildProjectPath(project.slug)),
  };
}

/** A project's picture's version. */
export const projectCardVersionOf = (project: ProjectCardProject) => {
  const words = projectCardOf(project);
  return hashOf(['project', words.title, ...words.lines, words.address].join('\n'));
};

/** A project's picture, under its one current address. */
export const projectCardUrlOf = (project: ProjectCardProject) =>
  `${buildProjectCardPath(project.slug)}?v=${projectCardVersionOf(project)}`;

/* ------------------------------------------------------------------------------------------------------------------ */
/* A step                                                                                                             */
/* ------------------------------------------------------------------------------------------------------------------ */

/** What a step's picture draws. */
type StepCardPage = Pick<BuildStepPage, 'project' | 'step' | 'of' | 'part'>;

/** A step: its place in the label, its name, then its project, and its optional part when it is in one. */
export function stepCardOf(page: StepCardPage): BuildCardWords {
  return {
    eyebrow: `Build · Step ${page.step.number} of ${page.of}`,
    built: false,
    login: null,
    title: page.step.title,
    lines: [page.project.name, page.part ? `Optional part: ${page.part.name}` : null].filter((line): line is string =>
      Boolean(line),
    ),
    address: addressOf(buildStepPath(page.project.slug, page.step.slug)),
  };
}

/** A step's picture's version. */
export const stepCardVersionOf = (page: StepCardPage) => {
  const words = stepCardOf(page);
  return hashOf(['step', words.eyebrow, words.title, ...words.lines, words.address].join('\n'));
};

/** A step's picture, under its one current address. */
export const stepCardUrlOf = (page: StepCardPage) =>
  `${buildStepCardPath(page.project.slug, page.step.slug)}?v=${stepCardVersionOf(page)}`;

/* ------------------------------------------------------------------------------------------------------------------ */
/* Build's home                                                                                                       */
/* ------------------------------------------------------------------------------------------------------------------ */

/** Build home's picture: the landing's own sentence. */
export const HOME_CARD: BuildCardWords = {
  eyebrow: 'Build',
  built: false,
  login: null,
  title: 'Build real things with your own AI agent',
  lines: ['One small step at a time. At the end you understand what you built.'],
  address: addressOf(BUILD_HOME_PATH),
};

/** Build home's picture, under its one current address. */
export const BUILD_HOME_CARD_URL = `${BUILD_HOME_CARD_PATH}?v=${hashOf(
  ['home', HOME_CARD.title, ...HOME_CARD.lines, HOME_CARD.address].join('\n'),
)}`;
