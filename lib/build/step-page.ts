import type { Route } from 'next';

import { diffCountsOf, parseDiff } from './step-diff';
import type {
  BuildFileStatus,
  BuildLanguage,
  BuildMine,
  BuildNeed,
  BuildProjectMine,
  BuildProjectPage,
  BuildStepLanguage,
  BuildStepMine,
  BuildStepPage,
  BuildStepRef,
} from './types';
import { languageNameOf } from '@/lib/workspace/learn-question';

/*
 * A step's page, pure: the words and the states the page draws from the public step, its project and the person's
 * side. Nothing here reads anything.
 */

/** The public repository that holds every step's code. */
export const BUILD_CODE_REPO = 'https://github.com/gitranks/build';

/** A file of a step's commit on GitHub. */
export const buildFileUrlOf = (commit: string, path: string) =>
  `${BUILD_CODE_REPO}/blob/${encodeURIComponent(commit)}/${path.split('/').map(encodeURIComponent).join('/')}`;

/** The whole project as a step's commit holds it, on GitHub. */
export const buildTreeUrlOf = (commit: string) => `${BUILD_CODE_REPO}/tree/${encodeURIComponent(commit)}`;

/** A project's base in one language, on GitHub: its branch (`mcp-server/typescript/base`), one commit a step. */
export const buildBaseUrlOf = (project: string, language: string) =>
  `${BUILD_CODE_REPO}/tree/${[project, language, 'base'].map(encodeURIComponent).join('/')}`;

/** The sentence a person says in their agent to start a project: "Teach me how to build an MCP server with GitRanks". */
export const buildSayOf = (thing: string) => `Teach me how to build ${thing} with GitRanks`;

/** The sentence a person with a build says in their agent to go on. */
export const CONTINUE_SAY = 'Continue my build';

/** The languages a step is written in, in the order the API sends them. */
export const stepLanguagesOf = (page: BuildStepPage): BuildLanguage[] => page.languages.map((side) => side.language);

/** One language's side of a step; the first one the step has when it has not this one. */
export const stepSideOf = (page: BuildStepPage, language: BuildLanguage | null): BuildStepLanguage | null =>
  page.languages.find((side) => side.language === language) ?? page.languages[0] ?? null;

/** The words a file's status shows beside its path; none for a changed one. */
export const FILE_STATUS_WORDS: Record<BuildFileStatus, string | null> = {
  added: 'new file',
  changed: null,
  removed: 'removed',
};

/** A changed file as the page draws it: its path and status, its diff read, and how many lines it added and removed. */
export type StepFile = {
  path: string;
  status: BuildFileStatus;
  hunks: ReturnType<typeof parseDiff>;
  added: number;
  removed: number;
};

/** The changed files of one language's side, each with its diff read. */
export function stepFilesOf(side: BuildStepLanguage | null): StepFile[] {
  return (side?.changed ?? []).map((file) => {
    const hunks = parseDiff(file.diff);
    return { path: file.path, status: file.status, hunks, ...diffCountsOf(hunks) };
  });
}

/** "1 file", "5 files". */
export const filesWordsOf = (count: number) => (count === 1 ? '1 file' : `${count} files`);

/** A file opens its diff while fewer than this many are open and the rows shown stay under `OPEN_ROWS_UNDER`. */
export const OPEN_FILES_MAX = 3;
export const OPEN_ROWS_UNDER = 150;

/**
 * Which files open their diff at first: the first one always, then each next one while fewer than three are open and
 * the lines shown so far stay under 150. The others show their header and "Show the change".
 */
export function openFilesOf(files: readonly StepFile[]): boolean[] {
  let open = 0;
  let rows = 0;
  return files.map((file, index) => {
    const lines = file.hunks.reduce((sum, hunk) => sum + hunk.lines.length, 0);
    const opens = index === 0 || (open < OPEN_FILES_MAX && rows < OPEN_ROWS_UNDER);
    if (opens) {
      open += 1;
      rows += lines;
    }
    return opens;
  });
}

/** The steps the strip shows a square for: the base's, or those of the step's part. */
export function stripStepsOf(page: BuildStepPage, project: BuildProjectPage | null): BuildStepRef[] {
  if (!project) return [];
  if (!page.part) return project.base;
  return project.partsFull.find((part) => part.slug === page.part?.slug)?.steps ?? [];
}

/** How a square of the strip looks: a step to do, one passed, or where the person's build stands. */
export type SquareKind = 'plain' | 'done' | 'current';

/** A square: its step, how it looks, and whether it is this page's step (ringed). */
export type StripSquare = { step: BuildStepRef; kind: SquareKind; here: boolean };

/** The step a build stands on among the strip's steps: its base step, or its part's step when the page is in that part. */
function standingSlugOf(build: BuildMine | null, page: BuildStepPage): string | null {
  if (!build) return null;
  if (page.part) return build.partStep?.part === page.part.slug ? build.partStep.step.slug : null;
  return build.state.kind === 'in_progress' ? build.state.step.slug : null;
}

/** The strip's squares: one for each step of the base or the part, the person's own marked when there is a build. */
export function stripSquaresOf(steps: readonly BuildStepRef[], page: BuildStepPage, build: BuildMine | null) {
  const done = new Set(build?.stepsDone ?? []);
  const standing = standingSlugOf(build, page);
  return steps.map(
    (step): StripSquare => ({
      step,
      kind: step.slug === standing ? 'current' : done.has(step.slug) ? 'done' : 'plain',
      here: step.slug === page.step.slug,
    }),
  );
}

/** What the browser read of the person for a step's page: where the step stands, and their builds of the project. */
export type StepPersonal = { step: BuildStepMine; project: BuildProjectMine | null };

/** The person's build of the project in a language; none without one. */
export const buildInOf = (personal: StepPersonal | null, language: BuildLanguage | null): BuildMine | null =>
  personal?.project?.builds.find((build) => build.language === language) ?? null;

/**
 * The language of the person's build the squares and the row follow: the language shown when they have a build in it,
 * else their build touched last, whatever language the code is shown in; none with no build of the project.
 */
export function personalLanguageOf(personal: StepPersonal | null, shown: BuildLanguage | null): BuildLanguage | null {
  if (!personal) return null;
  const mine = [...(personal.project?.builds ?? []), ...personal.step.builds].map((build) => build.language);
  if (shown && mine.includes(shown)) return shown;
  return startLanguageOf(personal);
}

/** The language of the person's build a step's page starts its switch at: their build touched last. */
export function startLanguageOf(personal: StepPersonal | null): BuildLanguage | null {
  return personal?.project?.builds[0]?.language ?? personal?.step.builds[0]?.language ?? null;
}

/** Where a person's build stands, for the line that says where to go on. */
export type BuildStanding =
  | { kind: 'step'; step: BuildStepRef; part: boolean }
  | { kind: 'test' }
  | { kind: 'built' }
  | { kind: 'unknown' };

/** Where a build stands: a base step, a part's step (once built), the test, or built. */
export function standingOf(build: BuildMine | null): BuildStanding {
  if (!build) return { kind: 'unknown' };
  if (build.state.kind === 'in_progress') return { kind: 'step', step: build.state.step, part: false };
  if (build.state.kind === 'test_left') return { kind: 'test' };
  if (build.partStep) return { kind: 'step', step: build.partStep.step, part: true };
  return { kind: 'built' };
}

/** The row under a step's title, by who reads it: the sentence to say, with what it means for them. */
export type AgentRow =
  | { kind: 'visitor' }
  | { kind: 'current'; language: BuildLanguage }
  | { kind: 'done'; language: BuildLanguage; standing: BuildStanding }
  | { kind: 'to_come'; language: BuildLanguage; standing: BuildStanding };

/**
 * The row under the title: a visitor's (and anyone with no build of the project), or the person's build on this step,
 * past it, or before it. It follows the build in the language shown when there is one, else the build touched last.
 */
export function agentRowOf(personal: StepPersonal | null, shown: BuildLanguage | null): AgentRow {
  const language = personalLanguageOf(personal, shown);
  const status = personal?.step.builds.find((build) => build.language === language)?.status;
  if (!status || !language) return { kind: 'visitor' };
  if (status === 'current') return { kind: 'current', language };
  const standing = standingOf(buildInOf(personal, language));
  return status === 'done' ? { kind: 'done', language, standing } : { kind: 'to_come', language, standing };
}

/** A language's name, as the switch and the row say it. */
export const buildLanguageNameOf = (language: BuildLanguage) => languageNameOf(language);

/** A link the row's line ends with. */
export type RowLink = { label: string; href: Route };

/** The row's line under the sentence, and the link it ends with. */
export type RowLine = { text: string; link: RowLink | null };

/** The line that says where a build stands, with the link that goes there. */
export function standingLineOf(
  standing: BuildStanding,
  links: { step: (slug: string) => Route; test: Route; mine: Route },
): RowLine {
  switch (standing.kind) {
    case 'step': {
      const { number, title, slug } = standing.step;
      const where = standing.part ? `step ${number} of the part` : `step ${number}`;
      return {
        text: `Your build is now on ${where}, ${title}.`,
        link: { label: `Go to step ${number}`, href: links.step(slug) },
      };
    }
    case 'test':
      return {
        text: 'Every step of the base is done, and the test waits for you.',
        link: { label: 'Take the test', href: links.test },
      };
    case 'built':
      return { text: 'You built this project.', link: { label: 'My builds', href: links.mine } };
    default:
      return { text: 'Say this in your agent to go on.', link: { label: 'My builds', href: links.mine } };
  }
}

/** "About an hour and a half": how long the base takes, in words. */
export function minutesWordsOf(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 55) return `About ${Math.max(5, Math.round(minutes / 5) * 5)} minutes`;
  const halves = Math.round(minutes / 30);
  const hours = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  if (hours === 1) return half ? 'About an hour and a half' : 'About an hour';
  return half ? `About ${hours} and a half hours` : `About ${hours} hours`;
}

/** What a project needs, as the first step lists it: the runtimes in one line, then each other need with why. */
export type NeedLine = { name: string; why: string | null };

const RUNTIME_WHY = 'Your agent checks this before the first step.';

/** The lines of "What you need": "Node 22 or newer, or Python 3.12 or newer", then each other need. */
export function needLinesOf(needs: readonly BuildNeed[]): NeedLine[] {
  const runtimes = needs
    .filter((need) => need.language !== null)
    .map((need) => (need.version ? `${need.name} ${need.version} or newer` : need.name));
  const others = needs.filter((need) => need.language === null).map((need) => ({ name: need.name, why: need.why }));
  return [...(runtimes.length ? [{ name: runtimes.join(', or '), why: RUNTIME_WHY }] : []), ...others];
}

/** Whether a step is the first of the base: its page also lists the base's steps and what the project needs. */
export const isFirstStep = (page: BuildStepPage) => page.part === null && page.step.number === 1;

/** A text's paragraphs, split at blank lines; none for an empty text. */
export const paragraphsOf = (text: string | null | undefined): string[] =>
  (text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

/** A thing to try: its words, and the line to type when the item gives one on its own line. */
export const playItemOf = (item: string): { text: string; type: string | null } => {
  const [text, ...rest] = item.replace(/\r\n?/g, '\n').split('\n');
  const type = rest.join('\n').trim();
  return { text: text.trim(), type: type || null };
};

/** "The playground of this project is your own agent, with your server connected to it." */
export function playgroundWordsOf(playground: string | null | undefined): string | null {
  const text = playground?.trim().replace(/\.$/, '');
  if (!text) return null;
  const lead = /^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text;
  return `The playground of this project is ${lead}.`;
}

/** What a step's strip says of its place: "Step 7 of 16". */
export const placeWordsOf = (page: BuildStepPage) => `Step ${page.step.number} of ${page.of}`;

const DESCRIPTION_MAX = 160;

/** A step's description for search engines and link previews: the first paragraph of what it does, cut at a word. */
export function stepDescriptionOf(page: BuildStepPage): string {
  const first = (paragraphsOf(page.say)[0] ?? page.step.title).replace(/`/g, '').replace(/\s+/g, ' ');
  if (first.length <= DESCRIPTION_MAX) return first;
  const cut = first.slice(0, DESCRIPTION_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length)}…`;
}
