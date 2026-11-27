import { Check, Star } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ProjectSay } from './project-say';
import { ProjectSquares } from './project-squares';
import { Button } from '@/components/ui/button';
import { BUILD_ABOUT_PATH, buildStartPath, buildStepPath, buildTestPath } from '@/lib/build/paths';
import {
  CONTINUE_SENTENCE,
  dayOf,
  dayYearOf,
  failedTestOf,
  goldWordsOf,
  languageNameOf,
  nextPartOf,
  otherBuildLineOf,
  type ProjectSide,
  partHrefOf,
  partNameOf,
  partsBuiltOf,
  squaresOf,
  startSentenceOf,
  stepMarksOf,
} from '@/lib/build/project';
import type { BuildMine, BuildProjectPage, BuildTest } from '@/lib/build/types';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/*
 * The box "what to do now", under a project's name. One frame in every state: a title, a few words, the action, one
 * quiet line. Someone who is signed out, or whose agent never connected, gets one main button, "Connect your agent".
 * Someone whose agent is connected gets the sentence to say. A build shows where it stands; a test that waits is the
 * main button. A person with two builds of the project sees the one touched last, and the other in one line.
 */

/** The agents a person can connect, as the box names them. */
const AGENTS = 'Claude Code, Codex, Cursor, Gemini CLI or VS Code';

/** The questions of a test, and how long it takes. */
const TEST_QUESTIONS = 10;
const TEST_TIME = 'About 3 minutes';

/** The box's frame: the title with a few words on its right, then what the state draws. */
function Box({
  kind,
  title,
  aside = null,
  tail = null,
  children,
}: {
  kind: string;
  title: ReactNode;
  aside?: string | null;
  /** The line that names the person's other build of the project, last in the box. */
  tail?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      data-project-box={kind}
      aria-label="What to do now"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        {aside && <span className="text-sm text-muted-foreground">{aside}</span>}
      </div>
      {children}
      {tail}
    </section>
  );
}

const Words = ({ children }: { children: ReactNode }) => (
  <p className="m-0 text-sm text-muted-foreground">{children}</p>
);

const Quiet = ({ children }: { children: ReactNode }) => (
  <p data-project-box-quiet className="m-0 text-xs text-muted-foreground">
    {children}
  </p>
);

const Actions = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

const TextLink = ({ href, children }: { href: Route; children: ReactNode }) => (
  <Link href={href} className="font-medium text-link hover:underline">
    {children}
  </Link>
);

/** The main button of a view. */
const Main = ({ href, size = 'lg', children }: { href: Route; size?: 'lg' | 'default'; children: ReactNode }) => (
  <Button asChild size={size} className="font-semibold">
    <Link href={href}>{children}</Link>
  </Button>
);

/** A mark of a build, as a small chip. */
function Chip({ kind, children }: { kind: 'answered' | 'parts' | 'repeated'; children: ReactNode }) {
  if (kind === 'repeated') {
    return (
      <span
        data-project-chip={kind}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning-soft-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--warning)_35%,transparent)]"
      >
        <Star aria-hidden="true" className="size-3.5 fill-current text-warning" />
        {children}
      </span>
    );
  }
  if (kind === 'answered') {
    return (
      <span
        data-project-chip={kind}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-soft-foreground"
      >
        <Check aria-hidden="true" className="size-4" />
        {children}
      </span>
    );
  }
  return (
    <span
      data-project-chip={kind}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      {children}
    </span>
  );
}

/** The box for someone with no build: connect an agent first, or say the sentence once one is connected. */
function StartBox({ project, side }: { project: BuildProjectPage; side: ProjectSide }) {
  const title = 'Build it with your own agent';
  const start = startSentenceOf(project);
  if (side.kind === 'pending') {
    // Not known yet whether the reader has an agent: the sentence, and no button that may turn out wrong.
    return (
      <Box kind="pending" title={title}>
        <ProjectSay sentence={start} />
      </Box>
    );
  }
  if (side.kind === 'person' && side.mine.agentConnected) {
    return (
      <Box kind="say" title={title}>
        <Words>
          Say this in your agent. It asks which language and which folder, checks that the language runs on your
          machine, and starts with step 1.
        </Words>
        <ProjectSay sentence={side.mine.say.trim() || start} />
        <Quiet>
          Using another agent for this? <TextLink href={WORKSPACE_PATHS.agentConnect}>Connect it too</TextLink>
          {' · '}
          <TextLink href={BUILD_ABOUT_PATH}>How Build works</TextLink>
        </Quiet>
      </Box>
    );
  }
  return (
    <Box kind="connect" title={title}>
      <Words>
        {side.kind === 'person'
          ? 'No agent is connected to your GitRanks account yet. Connecting one takes about a minute. Then say this in it:'
          : `You need an agent of your own, connected to GitRanks: ${AGENTS}. Connecting takes about a minute. Then say this in it:`}
      </Words>
      <ProjectSay sentence={start} />
      <Actions>
        <Main href={buildStartPath(project.slug)}>Connect your agent</Main>
        <TextLink href={BUILD_ABOUT_PATH}>How Build works</TextLink>
      </Actions>
    </Box>
  );
}

/** "TypeScript · last step 26 Nov": the build's language and when it last moved. */
const movedAsideOf = (build: BuildMine) =>
  `${languageNameOf(build.language)} · ${build.stepsDone.length ? 'last step' : 'started'} ${dayOf(build.lastStepAt)}`;

/** A build on a step of the base. */
function InProgressBox({ project, build, tail }: { project: BuildProjectPage; build: BuildMine; tail: ReactNode }) {
  if (build.state.kind !== 'in_progress') return null;
  const { step, of } = build.state;
  return (
    <Box
      kind="in_progress"
      title={`Your build is on step ${step.number} of ${of}`}
      aside={movedAsideOf(build)}
      tail={tail}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ProjectSquares squares={squaresOf(project.base, stepMarksOf(build))} />
        <span className="text-sm">
          Next: <TextLink href={buildStepPath(project.slug, step.slug)}>{step.title}</TextLink>
        </span>
      </div>
      <ProjectSay sentence={CONTINUE_SENTENCE} />
      <Quiet>Say this in your agent, in any chat, on any machine. It picks up at step {step.number}.</Quiet>
    </Box>
  );
}

/** The line under the test's button: the optional parts, which can come first. None when every part is built. */
function KeepBuildingLine({ project, build }: { project: BuildProjectPage; build: BuildMine }) {
  const part = nextPartOf(project, build);
  const href = part ? partHrefOf(project, part, build) : null;
  if (!part || !href) return null;
  const link = <TextLink href={href}>{part.name}</TextLink>;
  if (build.partStep?.part === part.slug) {
    return (
      <Quiet>
        Or keep building first: you are on step {build.partStep.step.number} of {build.partStep.of} of {link}. The test
        waits for you.
      </Quiet>
    );
  }
  const { built, of } = partsBuiltOf(project, build);
  if (built > 0) {
    return (
      <Quiet>
        Or keep building first. You built {built} of the {of} optional parts; the next is {link}. The test waits for
        you.
      </Quiet>
    );
  }
  return (
    <Quiet>
      Or keep building first: {of === 1 ? 'the optional part is' : `the first of the ${of} optional parts is`} {link}.
      The test waits for you.
    </Quiet>
  );
}

/** Every base step done, the test not taken or not passed yet. */
function TestLeftBox({
  project,
  build,
  failed,
  testHref,
  tail,
}: {
  project: BuildProjectPage;
  build: BuildMine;
  failed: BuildTest | null;
  testHref: Route;
  tail: ReactNode;
}) {
  const last = failed?.last;
  if (failed && last) {
    return (
      <Box
        kind="test_failed"
        title={`The test: ${last.right} of ${last.items.length || TEST_QUESTIONS} right. ${failed.need} are needed`}
        aside={languageNameOf(build.language)}
        tail={tail}
      >
        <Words>
          Each wrong answer showed its reason and its step. Take it again when you like. The questions will be
          different.
        </Words>
        <Actions>
          <Main href={testHref}>Take the test again</Main>
          <TextLink href={testHref}>See your answers of last time</TextLink>
        </Actions>
      </Box>
    );
  }
  return (
    <Box
      kind="test_left"
      title={`All ${project.base.length} steps are done. One thing is left: the test`}
      aside={movedAsideOf(build)}
      tail={tail}
    >
      <Words>
        {TEST_QUESTIONS} questions about what you built, here on the site, by yourself. The answers show at the end. 7
        right makes this project Built.
      </Words>
      <Actions>
        <Main href={testHref}>Take the test</Main>
        <span className="text-sm text-muted-foreground">{TEST_TIME}</span>
      </Actions>
      <KeepBuildingLine project={project} build={build} />
    </Box>
  );
}

/** A built project: the date, the marks, and the gold test; or the optional part in progress. */
function BuiltBox({
  project,
  build,
  goldHref,
  tail,
}: {
  project: BuildProjectPage;
  build: BuildMine;
  goldHref: Route;
  tail: ReactNode;
}) {
  if (build.state.kind !== 'built') return null;
  const { builtAt, score, gold } = build.state;
  const inPart = build.partStep;
  const part = inPart ? project.partsFull.find((each) => each.slug === inPart.part) : undefined;
  const partName = inPart ? partNameOf(project, inPart.part) : null;
  const { built, of } = partsBuiltOf(project, build);
  const chips = [
    gold.kind === 'earned' && (
      <Chip key="repeated" kind="repeated">
        Repeated after a week
      </Chip>
    ),
    build.answeredEveryStep && (
      <Chip key="answered" kind="answered">
        Answered every step
      </Chip>
    ),
    !part && built > 0 && (
      <Chip key="parts" kind="parts">
        {of === 1 ? 'The optional part is built' : `${built} of ${of} optional parts built`}
      </Chip>
    ),
  ].filter(Boolean);
  const title = (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-positive">
        <Check aria-hidden="true" className="size-4" />
      </span>
      Built on {dayYearOf(builtAt)}
      {gold.kind === 'earned' ? `, repeated on ${dayOf(gold.at)}` : ''}
    </span>
  );
  const language = languageNameOf(build.language);
  const goldWords = goldWordsOf(gold, builtAt);
  return (
    <Box
      kind="built"
      title={title}
      aside={part && partName ? `${language} · now in an optional part` : `${language} · ${score} of 10 in the test`}
      tail={tail}
    >
      {chips.length > 0 && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
      {inPart && part && partName ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm font-medium">
              {partName}: step {inPart.step.number} of {inPart.of}
            </span>
            <ProjectSquares squares={squaresOf(part.steps, stepMarksOf(build))} />
          </div>
          <ProjectSay sentence={CONTINUE_SENTENCE} />
          {gold.kind === 'opens_on' && <Quiet>The gold test opens on {dayOf(gold.date)}.</Quiet>}
          {gold.kind === 'open' && (
            <Quiet>
              The gold test is open. <TextLink href={goldHref}>Take the gold test</TextLink>
            </Quiet>
          )}
        </>
      ) : (
        <>
          {goldWords && <Words>{goldWords}</Words>}
          {gold.kind === 'open' && (
            <Actions>
              <Main href={goldHref} size="default">
                Take the gold test
              </Main>
            </Actions>
          )}
        </>
      )}
    </Box>
  );
}

/** The box "what to do now", for whoever reads the page. */
export function ProjectBox({ project, side }: { project: BuildProjectPage; side: ProjectSide }) {
  const builds = side.kind === 'person' ? side.mine.builds : [];
  const build = builds[0];
  if (!build) return <StartBox project={project} side={side} />;
  const other = builds[1] ?? null;
  const tail = other ? (
    <p data-project-other-build className="m-0 text-sm text-muted-foreground">
      {otherBuildLineOf(other)}
    </p>
  ) : null;
  // With two builds the test's address names this one's language, so the test is this build's.
  const language = other ? build.language : null;
  if (build.state.kind === 'in_progress') return <InProgressBox project={project} build={build} tail={tail} />;
  if (build.state.kind === 'test_left') {
    return (
      <TestLeftBox
        project={project}
        build={build}
        failed={failedTestOf(side)}
        testHref={buildTestPath(project.slug, 'end', language)}
        tail={tail}
      />
    );
  }
  return (
    <BuiltBox project={project} build={build} goldHref={buildTestPath(project.slug, 'gold', language)} tail={tail} />
  );
}
