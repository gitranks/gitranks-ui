import type { Metadata } from 'next';

import type { BuildLevel, BuildMine, BuildProjectCard, BuildStart } from './types';
import type { AgentConnectVariant } from '@/lib/workspace/agent-connect';
import { languageNameOf } from '@/lib/workspace/learn-question';

/*
 * The start flow, `/build/start`: what "Connect your agent" opens. Two steps, both always on the page: connect your
 * agent, then start your project. The page moves on by itself when the agent calls and when the build starts. Its
 * words are here, so the page and the design catalogue draw the same ones.
 */

/** The flow's two steps, as the line at the top names them. */
export const BUILD_START_STEPS = ['Your agent', 'Your project'] as const;

/** The page's title and its line. */
export const BUILD_START_HEAD = {
  title: 'Start building',
  text: 'Connect your own agent once. Then one sentence in it starts your project.',
} as const;

/** The page is the person's own: never indexed. */
export const BUILD_START_METADATA: Metadata = {
  title: BUILD_START_HEAD.title,
  robots: { index: false, follow: false },
};

/** No call this long after "I added it": the waiting line says so. */
export const BUILD_START_LATE_MS = 10 * 60_000;

/** The words of the two step cards. */
export const BUILD_START_WORDS = {
  agentTitle: '1 · Connect your agent',
  agentIntro: 'Once per computer. Your agent works with the plan you already have.',
  signInText:
    'Your GitHub account is needed from here: your agent signs in with it, and your place in each build is kept under it.',
  signIn: 'Sign in with GitHub',
  anotherAgent: 'Connect another agent',
  projectTitle: '2 · Start your project',
  projectLocked: 'Shows when your agent is connected.',
  pick: 'Pick what to build. You can build the others later.',
  pickNone: 'Pick what to build on the list of projects.',
  pickNoneLink: 'See the projects',
  sayLabel: 'Ask your agent',
  copy: 'Copy the sentence',
  pickAnother: 'Pick another project',
  movesOn: 'This page moves on by itself when your build starts, usually within a minute of the sentence.',
  reminders:
    'We email you twice at most for a project: when its gold test opens, and once if your build stands still for 3 days.',
  remindersOff: 'Turn it off in Settings',
  startedTitle: 'Your build has started',
  openProject: 'Open the project',
  home: 'Build home',
  startedFoot: 'Your place shows on the project’s page and on Build home from now on.',
  lost: 'This page stopped checking: we could not read where you stand. Reload it to check again.',
} as const;

/** The agent's part of step 1: Build's own words in the shared connect steps, where signing in is the one way. */
export const BUILD_AGENT_VARIANT: AgentConnectVariant = {
  intro: BUILD_START_WORDS.agentIntro,
  about: (name) =>
    `${name} signs in to GitRanks with your GitHub account, and you allow it in your browser. For Build it gets one step at a time, brings in the code of that step, and tells us the step works. It writes only inside the folder of your build. Disconnect it any time on the Agent page.`,
  late: {
    ms: BUILD_START_LATE_MS,
    title: (name) => `${name} has not called GitRanks after 10 minutes.`,
    text: (client, check) =>
      client === 'claude-code'
        ? 'Check that it is running, type /mcp in it and see that gitranks is listed, then choose Authenticate. This page moves on by itself when the call comes.'
        : `Check that it is running. ${check} This page moves on by itself when the call comes.`,
  },
};

/** "Claude Code is connected"; "Your agent is connected" when the page does not know which agent called. */
export const connectedTitleOf = (agent: string | null) => `${agent ?? 'Your agent'} is connected`;

/** What step 2 says over the sentence, for the agent named, or any. */
export const sayIntroOf = (agent: string | null) =>
  `Say this in ${agent ?? 'your agent'}. It asks which language and which folder, checks that the language runs on your machine, and starts with step 1.`;

/** The sentence that starts a project in the agent: "Teach me how to build an MCP server with GitRanks". */
export const buildSayOf = (project: Pick<BuildProjectCard, 'thing'>) =>
  `Teach me how to build ${project.thing} with GitRanks`;

/** The way back to a project the flow was opened from. */
export const backToProjectOf = (project: Pick<BuildProjectCard, 'name'>) => `Back to ${project.name}`;

const LEVEL_WORDS: Record<BuildLevel, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

const HOUR_WORDS = ['', 'an hour', 'two hours', 'three hours', 'four hours', 'five hours', 'six hours'];

/**
 * How long a project's base takes, in words, to the nearest half hour: "about an hour and a half", "about two hours".
 * Under 45 minutes, to the nearest 5 minutes. Null for no time at all, which is never drawn.
 */
export function aboutMinutesOf(minutes: number): string | null {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 45) return `about ${Math.max(5, Math.round(minutes / 5) * 5)} minutes`;
  const halves = Math.round(minutes / 30);
  const hours = Math.floor(halves / 2);
  const half = halves % 2 === 1;
  const words = HOUR_WORDS[hours] ?? `${hours} hours`;
  if (!half) return `about ${words}`;
  return hours === 1 ? 'about an hour and a half' : `about ${words.replace(/ hours$/, '')} and a half hours`;
}

/** A project's row under its line: "Easy · 16 steps · about an hour and a half". A count of nothing is left out. */
export function projectRowMetaOf(project: Pick<BuildProjectCard, 'level' | 'baseSteps' | 'minutes'>): string {
  return [
    LEVEL_WORDS[project.level],
    project.baseSteps > 0 ? `${project.baseSteps} ${project.baseSteps === 1 ? 'step' : 'steps'}` : null,
    aboutMinutesOf(project.minutes),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** What the started card says: the project, the language, and the step the agent is on while the base is built. */
export function startedTextOf(build: Pick<BuildMine, 'project' | 'language' | 'state'>): string {
  const place =
    build.state.kind === 'in_progress' ? ` Your agent is on step ${build.state.step.number} of ${build.state.of}.` : '';
  return `${build.project.name}, in ${languageNameOf(build.language)}.${place} Go on there: it brings in each step, and you try it.`;
}

/** Where the flow stands: a visitor signs in; then the agent; then the project; then the build has started. */
export type BuildStartStage = 'sign_in' | 'agent' | 'project' | 'started';

export function buildStartStageOf({
  signedIn,
  start,
  connectedHere,
}: {
  signedIn: boolean;
  start: BuildStart | null;
  /** The agent called while the page was open. */
  connectedHere: boolean;
}): BuildStartStage {
  if (!signedIn) return 'sign_in';
  if (start?.build) return 'started';
  if (start?.agentConnected || connectedHere) return 'project';
  return 'agent';
}

/** The step the line at the top marks: the agent's, the project's, or both done once the build started. */
export const stripStepOf = (stage: BuildStartStage): 1 | 2 | 3 =>
  stage === 'started' ? 3 : stage === 'project' ? 2 : 1;

/**
 * The state read again, over the one the page holds: an agent that connected stays connected and a build that started
 * stays started, so an answer that missed a field (a read that failed half way) never moves the page back.
 */
export function mergeBuildStart(held: BuildStart | null, read: BuildStart | null): BuildStart | null {
  if (!read) return held;
  return {
    agentConnected: read.agentConnected || (held?.agentConnected ?? false),
    build: read.build ?? held?.build ?? null,
  };
}

/** The project the address names, among the live ones; none when it names no live project. */
export const projectOfAddress = (projects: readonly BuildProjectCard[], slug: string | null) =>
  slug ? (projects.find((project) => project.slug === slug) ?? null) : null;
