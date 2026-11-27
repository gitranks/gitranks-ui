import { Check } from 'lucide-react';
import Link from 'next/link';

import { ProjectCards } from '@/components/build/project-card';
import { buttonVariants } from '@/components/ui/button';
import { BUILD_CODE_URL, HOME_PROJECTS_SHOWN } from '@/lib/build/home';
import { BUILD_ABOUT_PATH, BUILD_PROJECTS_PATH, BUILD_START_PATH } from '@/lib/build/paths';
import type { BuildProjectCard } from '@/lib/build/types';
import { cn } from '@/lib/utils';

/*
 * Build's landing, for a visitor and for a signed-in person with no build; and "How Build works" for everyone. One
 * reading column: what Build is with one main button, how it works, the projects, what the agent does on the person's
 * machine, and questions.
 */

export const MAIN_BUTTON = cn(buttonVariants({ size: 'lg' }), 'font-semibold');
export const TEXT_LINK = 'font-medium text-link hover:underline';

const HOW: { title: string; text: string }[] = [
  {
    title: 'Say one sentence in your agent',
    text: '“Teach me how to build an MCP server with GitRanks.” It asks which language and folder, and starts.',
  },
  {
    title: 'Go step by step',
    text: 'Each step adds a few lines. Your agent brings them in, says what they do, and you try the result yourself.',
  },
  {
    title: 'Finish with a short test',
    text: '10 questions, here on the site. Pass, and the project is Built: it shows on your Skills page.',
  },
];

const LIMITS = [
  'It writes only inside the folder of your build.',
  'It brings in only code from our public repository, which you can read before you start.',
  'It runs only the language’s own runtime, the packages a project lists up front, and git.',
  'It never asks for a password, a key or a token.',
];

const QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'Does it cost anything?',
    answer: 'No. Build is free. You pay only for your own agent, as you do today.',
  },
  {
    question: 'Which model do I need?',
    answer:
      'A small, cheap one is enough. Every step carries its exact code, so the model only brings it in and explains it.',
  },
  {
    question: 'Do I write the code?',
    answer:
      'No. You read each change, try it, and answer a question about it if you want. That is where the learning is.',
  },
  { question: 'What does GitRanks keep?', answer: 'Your place in each build and your answers. None of your code.' },
  {
    question: 'How does it fit with Learn and Contribute?',
    answer:
      'Learn teaches an idea. Build lets you make something with it. Contribute is the real work: fixing issues in real projects.',
  },
];

/** A list in one bordered box, its rows split by hairlines. */
const BOX_LIST = 'm-0 flex list-none flex-col rounded-lg border bg-card p-0';
const ROW_SPLIT = 'border-t first:border-t-0';

/** The top: what Build is, and the one main button with the link beside it. Changes in place once the agent is known. */
function Intro({ agentConnected }: { agentConnected: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-balance">Build real things with your own AI agent</h1>
        <p className="m-0 text-base leading-relaxed">
          Pick a project. Your agent brings in the code one small step at a time, you try each step, and at the end you
          understand what you built.
        </p>
      </div>
      <div className="flex flex-col gap-2" data-landing-start={agentConnected ? 'pick' : 'connect'}>
        <div className="flex flex-wrap items-center gap-3">
          {agentConnected ? (
            <>
              <Link href={BUILD_PROJECTS_PATH} className={MAIN_BUTTON}>
                Pick a project
              </Link>
              <Link href={BUILD_START_PATH} className={TEXT_LINK}>
                How to start one
              </Link>
            </>
          ) : (
            <>
              <Link href={BUILD_START_PATH} className={MAIN_BUTTON}>
                Connect your agent
              </Link>
              <Link href={BUILD_PROJECTS_PATH} className={TEXT_LINK}>
                See the projects
              </Link>
            </>
          )}
        </div>
        <p className="m-0 text-xs text-muted-foreground">
          {agentConnected
            ? 'Your agent is connected. Say one sentence in it and the build starts.'
            : 'Free. Works with Claude Code, Codex, Cursor, Gemini CLI and VS Code.'}
        </p>
      </div>
    </div>
  );
}

/** The projects: six at the most, then one link to all of them. Not shown when there are none. */
export function LandingProjects({ projects }: { projects: readonly BuildProjectCard[] }) {
  if (!projects.length) return null;
  const shown = projects.slice(0, HOME_PROJECTS_SHOWN);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="build-projects-title">
      <h2 id="build-projects-title" className="m-0 text-xl font-bold tracking-tight">
        Projects
      </h2>
      <ProjectCards cards={shown} />
      {projects.length > shown.length ? (
        <p className="m-0 text-sm">
          <Link href={BUILD_PROJECTS_PATH} className={TEXT_LINK} data-all-projects="">
            All {projects.length} projects
          </Link>
        </p>
      ) : null}
    </section>
  );
}

/** "How Build works", kept reachable at the foot of Build's pages, after an optional sentence. */
export function HowBuildWorksFoot({ lead }: { lead?: string }) {
  return (
    <p className="m-0 text-xs text-muted-foreground" data-build-foot="">
      {lead ? `${lead} ` : null}
      <Link href={BUILD_ABOUT_PATH} className={TEXT_LINK}>
        How Build works
      </Link>
    </p>
  );
}

export type HomeLandingProps = {
  projects: readonly BuildProjectCard[];
  /** Whether an agent of the person's connected: the main button is then "Pick a project". */
  agentConnected: boolean;
  /** "How Build works" itself: no link to it at the foot. */
  about?: boolean;
};

/** The landing, in one reading column. */
export function HomeLanding({ projects, agentConnected, about = false }: HomeLandingProps) {
  return (
    <>
      <Intro agentConnected={agentConnected} />
      <section className="flex flex-col gap-3" aria-labelledby="build-how-title">
        <h2 id="build-how-title" className="m-0 text-xl font-bold tracking-tight">
          How it works
        </h2>
        <ol className={BOX_LIST}>
          {HOW.map((step, index) => (
            <li key={step.title} className={cn('flex items-start gap-3 p-3', ROW_SPLIT)}>
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold tabular-nums">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold">{step.title}</span>
                <span className="text-sm text-muted-foreground">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <LandingProjects projects={projects} />
      <section className="flex flex-col gap-3" aria-labelledby="build-trust-title">
        <div className="flex flex-col gap-1">
          <h2 id="build-trust-title" className="m-0 text-xl font-bold tracking-tight">
            What your agent does on your machine
          </h2>
          <p className="m-0 text-sm text-muted-foreground">
            Our server tells your agent what to do, one step at a time. These are the limits of what it asks.
          </p>
        </div>
        <ul className={BOX_LIST}>
          {LIMITS.map((limit) => (
            <li key={limit} className={cn('flex items-start gap-3 p-3 text-sm', ROW_SPLIT)}>
              <span className="mt-0.5 text-positive">
                <Check className="size-4 shrink-0" aria-hidden="true" />
              </span>
              <span>{limit}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-sm">
          <a href={BUILD_CODE_URL} className={TEXT_LINK} target="_blank" rel="noopener noreferrer">
            The code of every project, on GitHub
          </a>
        </p>
      </section>
      <section className="flex flex-col gap-3" aria-labelledby="build-faq-title">
        <h2 id="build-faq-title" className="m-0 text-xl font-bold tracking-tight">
          Questions
        </h2>
        <dl className="m-0 flex flex-col rounded-lg border bg-card">
          {QUESTIONS.map((entry) => (
            <div key={entry.question} className={cn('flex flex-col gap-1 p-3', ROW_SPLIT)}>
              <dt className="text-sm font-semibold">{entry.question}</dt>
              <dd className="m-0 text-sm text-muted-foreground">{entry.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      {about ? null : <HowBuildWorksFoot />}
    </>
  );
}
