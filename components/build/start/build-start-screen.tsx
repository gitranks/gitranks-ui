'use client';

import { CheckIcon, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, type Ref, useId } from 'react';
import { FaGithub } from 'react-icons/fa';

import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/workspace/code-block';
import { CopyButton } from '@/components/workspace/copy-button';
import { FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { HEADING } from '@/components/workspace/primitives';
import { BUILD_EMAILS_BUILT } from '@/lib/build/built-parts';
import { BUILD_HOME_PATH, BUILD_PROJECTS_PATH, BUILD_SETTINGS_PATH, buildProjectPath } from '@/lib/build/paths';
import {
  BUILD_START_HEAD,
  BUILD_START_STEPS,
  type BuildStartStage,
  backToProjectOf,
  buildSayOf,
  connectedTitleOf,
  projectRowMetaOf,
  sayIntroOf,
  startedTextOf,
  stripStepOf,
  BUILD_START_WORDS as WORDS,
} from '@/lib/build/start';
import type { BuildMine, BuildProjectCard } from '@/lib/build/types';
import { cn } from '@/lib/utils';

/*
 * The start flow as its boards draw it, from plain data: the line of two steps, the title, then the two step cards,
 * both always on the page. The live part (`build-start-live.tsx`) moves it; the catalogue draws each state from a
 * fixture.
 */

const card = 'flex flex-col gap-3.5 rounded-2xl bg-card p-5';
const activeCard = 'border-2 border-primary';
const idleCard = 'border';
const linkClass = 'font-medium text-link hover:underline max-sm:min-h-11 inline-flex items-center';

/** Where step 2 stands once the agent is connected: the sentence of one project, or the list to pick from. */
export type BuildStartProject =
  /** The sentence of a project: the one the address named (`back`, the way back to it), or one picked from the list. */
  | { kind: 'say'; project: BuildProjectCard; from: 'address' | 'list' }
  /** The live projects, as rows. */
  | { kind: 'pick'; projects: BuildProjectCard[] };

export type BuildStartScreenProps = {
  stage: BuildStartStage;
  /** Step 1's setup while the agent is not connected: the shared connect steps. */
  connect: ReactNode;
  /** The agent's name once connected; null when the page does not know which agent called. */
  agent: string | null;
  /** "Connect another agent" pressed: the setup shows again, under the connected line. */
  another?: boolean;
  onAnother?: () => void;
  project: BuildStartProject;
  onPick?: (project: BuildProjectCard) => void;
  onPickAnother?: () => void;
  /** The build, once started. */
  build: BuildMine | null;
  onSignIn?: () => void;
  signingIn?: boolean;
  /** Step 2's heading, which takes the focus as the step opens or changes in place. */
  projectHeadingRef?: Ref<HTMLHeadingElement>;
  /** A read of the state answered nothing: the page stopped asking, and says so in one line. */
  lost?: boolean;
};

/** The whole page under the site header. */
export function BuildStartScreen(props: BuildStartScreenProps) {
  return (
    <FlowFrame side="build" steps={BUILD_START_STEPS} step={stripStepOf(props.stage)}>
      <FlowHead title={BUILD_START_HEAD.title} text={BUILD_START_HEAD.text} />
      <AgentCard {...props} />
      <ProjectCard {...props} />
      {props.lost ? (
        <p role="status" className="text-sm text-muted-foreground" data-build-start-lost="">
          {WORDS.lost}
        </p>
      ) : null}
    </FlowFrame>
  );
}

/** Step 1: sign in, the setup, or the agent connected in one line. */
function AgentCard({ stage, connect, agent, another = false, onAnother, onSignIn, signingIn }: BuildStartScreenProps) {
  const id = useId();
  if (stage === 'sign_in') {
    return (
      <section aria-labelledby={id} className={cn(card, activeCard)} data-build-start-agent="sign-in">
        <h2 id={id} className={HEADING.card}>
          {WORDS.agentTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{WORDS.agentIntro}</p>
        <p className="text-sm text-muted-foreground">{WORDS.signInText}</p>
        <Button
          type="button"
          disabled={signingIn}
          onClick={onSignIn}
          className="min-h-11 gap-2.5 self-start px-4 font-semibold"
          data-sign-in="build-start"
        >
          <FaGithub aria-hidden="true" className="size-4" />
          {WORDS.signIn}
        </Button>
      </section>
    );
  }
  if (stage === 'agent') {
    return (
      <section aria-labelledby={id} className={cn(card, activeCard)} data-build-start-agent="setup">
        <h2 id={id} className={HEADING.card}>
          {WORDS.agentTitle}
        </h2>
        {connect}
      </section>
    );
  }
  return (
    <section aria-labelledby={id} className={cn(card, idleCard)} data-build-start-agent="connected">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <CheckIcon aria-hidden="true" className="size-4.5 flex-none text-positive" strokeWidth={2.6} />
          <h2 id={id} className={HEADING.card}>
            {connectedTitleOf(agent)}
          </h2>
        </span>
        <Button type="button" variant="outline" onClick={onAnother} aria-expanded={another} className="max-sm:min-h-11">
          {WORDS.anotherAgent}
        </Button>
      </div>
      {another ? connect : null}
    </section>
  );
}

/** Step 2: locked until the agent is connected; then the sentence or the list; then the build started. */
function ProjectCard({
  stage,
  agent,
  another = false,
  project,
  onPick,
  onPickAnother,
  build,
  projectHeadingRef,
}: BuildStartScreenProps) {
  const id = useId();
  const heading = (title: string) => (
    <h2 id={id} ref={projectHeadingRef} tabIndex={-1} className={cn(HEADING.card, 'outline-none')}>
      {title}
    </h2>
  );

  if (stage === 'sign_in' || stage === 'agent') {
    return (
      <section
        aria-labelledby={id}
        aria-disabled="true"
        className={cn(card, idleCard, 'gap-2 opacity-60')}
        data-build-start-project="locked"
      >
        {heading(WORDS.projectTitle)}
        <p className="text-sm text-muted-foreground">{WORDS.projectLocked}</p>
      </section>
    );
  }

  if (stage === 'started' && build) {
    return (
      <section aria-labelledby={id} className={cn(card, idleCard)} data-build-start-project="started">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2.5">
            <CheckIcon aria-hidden="true" className="size-4.5 flex-none text-positive" strokeWidth={2.6} />
            {heading(WORDS.startedTitle)}
          </span>
          <p className="text-sm text-muted-foreground">{startedTextOf(build)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            asChild
            variant={another ? 'outline' : 'default'}
            className="h-10 self-start px-6 font-semibold max-sm:min-h-11"
          >
            <Link href={buildProjectPath(build.project.slug)} prefetch={false}>
              {WORDS.openProject}
            </Link>
          </Button>
          <Link href={BUILD_HOME_PATH} prefetch={false} className={linkClass}>
            {WORDS.home}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{WORDS.startedFoot}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby={id} className={cn(card, activeCard)} data-build-start-project={project.kind}>
      {heading(WORDS.projectTitle)}
      {project.kind === 'say' ? (
        <>
          <p className="text-sm">{sayIntroOf(agent)}</p>
          <CodeBlock label={WORDS.sayLabel} wrap>
            {buildSayOf(project.project)}
          </CodeBlock>
          <div className="flex flex-wrap items-center gap-4">
            <CopyButton
              text={buildSayOf(project.project)}
              label={WORDS.copy}
              variant={another ? 'outline' : 'default'}
              className="h-10 self-start px-6 font-semibold"
            />
            {project.from === 'address' ? (
              <Link href={buildProjectPath(project.project.slug)} prefetch={false} className={linkClass}>
                {backToProjectOf(project.project)}
              </Link>
            ) : (
              <button type="button" onClick={onPickAnother} className={cn(linkClass, 'cursor-pointer')}>
                {WORDS.pickAnother}
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{WORDS.movesOn}</p>
          {/* Build's reminders are on from the first build: the one place that says so before the first email. */}
          {BUILD_EMAILS_BUILT ? (
            <p className="text-sm text-muted-foreground" data-build-start-reminders="">
              {WORDS.reminders}{' '}
              <Link href={BUILD_SETTINGS_PATH} prefetch={false} className="font-medium text-link hover:underline">
                {WORDS.remindersOff}
              </Link>
            </p>
          ) : null}
        </>
      ) : project.projects.length ? (
        <>
          <p className="text-sm text-muted-foreground">{WORDS.pick}</p>
          <ul className="m-0 flex list-none flex-col divide-y rounded-lg border bg-card p-0" data-build-start-rows="">
            {project.projects.map((each) => (
              <li key={each.slug}>
                <button
                  type="button"
                  onClick={() => onPick?.(each)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left hover:bg-accent"
                  data-build-start-row={each.slug}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold">{each.name}</span>
                    <span className="text-sm text-muted-foreground">{each.line}</span>
                    <span className="text-xs text-muted-foreground">{projectRowMetaOf(each)}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 flex-none text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {WORDS.pickNone}{' '}
          <Link href={BUILD_PROJECTS_PATH} prefetch={false} className="font-medium text-link hover:underline">
            {WORDS.pickNoneLink}
          </Link>
        </p>
      )}
    </section>
  );
}
