import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { HowBuildWorksFoot, MAIN_BUTTON, TEXT_LINK } from './home-landing';
import { ProjectCards } from '@/components/build/project-card';
import { SayRow } from '@/components/build/say-row';
import { StepSquares } from '@/components/build/step-squares';
import { buttonVariants } from '@/components/ui/button';
import {
  type BuildHomeBox,
  type BuildHomeView,
  CONTINUE_SENTENCE,
  dayWords,
  lastStepWords,
  stepOfBuild,
} from '@/lib/build/home';
import {
  BUILD_MINE_PATH,
  BUILD_PROJECTS_PATH,
  buildProjectPath,
  buildStepPath,
  buildTestPath,
} from '@/lib/build/paths';
import { LANGUAGE_NAMES, numberWordsFirst } from '@/lib/build/project-card';
import type { BuildMine } from '@/lib/build/types';
import { cn } from '@/lib/utils';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/*
 * A person's own Build home: what to do now in one box, the other builds in progress one row each, and the projects
 * to build next. A section with nothing in it is not shown, heading included.
 */

const SMALL_BUTTON = cn(buttonVariants(), 'font-semibold');
const OUTLINE_BUTTON = cn(buttonVariants({ variant: 'outline' }), 'font-semibold');

/** The box at the top: a heading with a quiet note on its right, then what it holds. */
function Box({ heading, note, kind, children }: { heading: string; note?: string; kind: string; children: ReactNode }) {
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
      aria-label="What to do now"
      data-home-box={kind}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 text-base font-semibold">{heading}</h2>
        {note ? <span className="text-sm text-muted-foreground">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** "What you built is in My builds.": Home does not list what is built. */
function BuiltElsewhere() {
  return (
    <p className="m-0 text-xs text-muted-foreground">
      What you built is in{' '}
      <Link href={BUILD_MINE_PATH} className={TEXT_LINK}>
        My builds
      </Link>
      .
    </p>
  );
}

/** What to do now, in one box. */
function NowBox({ box, now }: { box: BuildHomeBox; now: Date | null }) {
  if (box.kind === 'test') {
    const { test } = box;
    const href = buildTestPath(test.project.slug, test.kind, test.language);
    if (test.kind === 'gold') {
      return (
        <Box
          kind="gold"
          heading={`The gold test of “${test.project.name}” is open`}
          note={box.builtAt ? `Built on ${dayWords(box.builtAt)}` : undefined}
        >
          <p className="m-0 text-sm text-muted-foreground">
            A week has passed. 10 questions, and 8 right earns the gold mark. One try a day.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={href} className={MAIN_BUTTON}>
              Take the gold test
            </Link>
          </div>
        </Box>
      );
    }
    return (
      <Box
        kind="test"
        heading={`${test.project.name}: every step is done, the test is left`}
        note={LANGUAGE_NAMES[test.language]}
      >
        <p className="m-0 text-sm text-muted-foreground">
          10 questions about what you built, here on the site, by yourself. 7 right makes the project Built.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={href} className={MAIN_BUTTON}>
            Take the test
          </Link>
          <span className="text-sm text-muted-foreground">About 3 minutes</span>
        </div>
      </Box>
    );
  }
  if (box.kind === 'build') {
    const { build, step, of } = box;
    const when = now ? lastStepWords(build.lastStepAt, now) : '';
    return (
      <Box
        kind="build"
        heading={`${build.project.name}: step ${step.number} of ${of}`}
        note={[LANGUAGE_NAMES[build.language], when].filter(Boolean).join(' · ')}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <StepSquares current={step.number} of={of} />
          <span className="text-sm">
            Next:{' '}
            <Link href={buildStepPath(build.project.slug, step.slug)} className={TEXT_LINK}>
              {step.title}
            </Link>
          </span>
        </div>
        <SayRow sentence={CONTINUE_SENTENCE} note="Say this in your agent, in any chat, on any machine." />
      </Box>
    );
  }
  if (box.kind === 'pick') {
    return (
      <Box kind="pick" heading="Pick your next project">
        <p className="m-0 text-sm text-muted-foreground">
          Nothing waits for you. {numberWordsFirst(box.left)} {box.left === 1 ? 'project is' : 'projects are'} left to
          build.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={BUILD_PROJECTS_PATH} className={SMALL_BUTTON}>
            See the projects
          </Link>
        </div>
        <BuiltElsewhere />
      </Box>
    );
  }
  return (
    <Box kind="all_built" heading="You built every project we have">
      <p className="m-0 text-sm text-muted-foreground">
        New projects are added one at a time. Until then, the ideas you used have Learn courses, and real projects have
        issues that need them.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={WORKSPACE_PATHS.learnHome} className={OUTLINE_BUTTON}>
          Open Learn
        </Link>
        <Link href={WORKSPACE_PATHS.contribute} className={OUTLINE_BUTTON}>
          Fix a real issue
        </Link>
      </div>
      <BuiltElsewhere />
    </Box>
  );
}

/** Where a build stands, under its name: "Python · step 3 of 14". */
function rowWordsOf(build: BuildMine): string {
  const at = stepOfBuild(build);
  const where = at ? `step ${at.step.number} of ${at.of}` : 'every step done, the test is left';
  return `${LANGUAGE_NAMES[build.language]} · ${where}`;
}

/** Another build in progress: one row, a link to its project. */
function BuildRow({ build }: { build: BuildMine }) {
  const at = stepOfBuild(build);
  return (
    <li className="border-t first:border-t-0" data-home-row={build.build}>
      <Link
        href={buildProjectPath(build.project.slug)}
        className="flex items-center justify-between gap-3 p-3 hover:bg-accent"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-semibold">{build.project.name}</span>
          <span className="text-sm text-muted-foreground">{rowWordsOf(build)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {at ? <StepSquares current={at.step.number} of={at.of} className="max-sm:hidden" /> : null}
          <span className="text-muted-foreground">
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </li>
  );
}

/** The person's home: their builds first. `now` is the browser's clock once the page is up; none, no "last step". */
export function HomeBuilder({ view, now }: { view: Extract<BuildHomeView, { kind: 'home' }>; now: Date | null }) {
  return (
    <>
      <h1 className="m-0 text-3xl font-bold tracking-tight">Your builds</h1>
      <NowBox box={view.box} now={now} />
      {view.others.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="build-others-title">
          <h2 id="build-others-title" className="m-0 text-xl font-bold tracking-tight">
            Also in progress
          </h2>
          <ul className="m-0 flex list-none flex-col rounded-lg border bg-card p-0">
            {view.others.map((build) => (
              <BuildRow key={build.build} build={build} />
            ))}
          </ul>
        </section>
      ) : null}
      {view.next.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="build-next-title">
          <div className="flex flex-col gap-1">
            <h2 id="build-next-title" className="m-0 text-xl font-bold tracking-tight">
              Build next
            </h2>
            <p className="m-0 text-sm text-muted-foreground">Projects you have not started.</p>
          </div>
          <ProjectCards cards={view.next} />
        </section>
      ) : null}
      <HowBuildWorksFoot />
    </>
  );
}
