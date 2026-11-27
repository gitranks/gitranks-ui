'use client';

import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BackToProject,
  type BuildTestProject,
  TestDoneEnd,
  TestFrame,
  TestMessage,
  TestNotice,
  TestPending,
  TestQuestion,
  TestResult,
} from './test-parts';
import { Button } from '@/components/ui/button';
import { PlayerRunEnd } from '@/components/workspace/player/player-strip';
import { usePlayer } from '@/components/workspace/player/use-player';
import { useLearnAnswer } from '@/components/workspace/question/use-learn-answer';
import { TimeZoneNote } from '@/components/workspace/time-zone-note';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { buildTestPath } from '@/lib/build/paths';
import {
  answerGroupsOf,
  type BuildTestResultShown,
  type BuildTestRunShown,
  type BuildTestShown,
  buildTestViewOf,
  closedWordsOf,
  NO_BUILD_WORDS,
  RUN_EXPIRED_NOTE,
  scoreTextOf,
  scoreTitleOf,
  TEST_NAMES,
  testBoxOf,
  testBuildOf,
} from '@/lib/build/test';
import { answerBuildTestRun, readBuildProjectMine, readBuildTest, startBuildTestRun } from '@/lib/build/test-live';
import type { BuildLanguage, BuildMine, BuildTestKind } from '@/lib/build/types';
import { readBuildZone, zoneSent } from '@/lib/build/zone-live';
import { hasSessionHint } from '@/lib/session-hint';
import type { LearnQuestion } from '@/lib/workspace/learn-question';
import { type PlayerResult, runWordsOf } from '@/lib/workspace/player';

/** Where the page stands: not known yet, a visitor, a read or a start that failed, no test now, a run, or a result. */
type Personal =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'failed' }
  | { kind: 'no-build' }
  | { kind: 'start-failed' }
  | { kind: 'closed'; test: BuildTestShown; build: BuildMine | null }
  | { kind: 'run'; test: BuildTestShown; run: BuildTestRunShown; sitting: number }
  | { kind: 'result'; test: BuildTestShown; result: BuildTestResultShown; build: BuildMine | null; sitting: number };

/** A heading that takes the focus once it shows, so a screen reader starts there. */
function useFocusOnShow<T extends HTMLElement>(shown: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (shown) ref.current?.focus({ preventScroll: true });
  }, [shown]);
  return ref;
}

/**
 * A build's test (the end test or the gold test) in the browser. The page is the person's own: once it is up, a person
 * with a session reads their test, and a visitor is asked to sign in. Reading writes nothing. A run in progress opens
 * on its next question; with no run and a start allowed, a run starts at once (there is no start page); a last result
 * shows as it is, so a reload after the tenth answer shows it again. When a run cannot start and there is no result,
 * the page says why and leads back to the project.
 */
export function BuildTestLive({
  project,
  kind,
  language,
}: {
  project: BuildTestProject;
  kind: BuildTestKind;
  language: BuildLanguage | null;
}) {
  const [personal, setPersonal] = useState<Personal>({ kind: 'pending' });
  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  /** The zone the person's days are counted in, once read: every date of the page is written in it. */
  const [zone, setZone] = useState<string | undefined>(undefined);
  /** Whether the person's own test was read once: their device's time zone is then sent, as on Learn's pages. */
  const [known, setKnown] = useState(false);
  const sittings = useRef(0);
  const { slug } = project;

  /** A run, read or started: its next question. */
  const runOf = useCallback((test: BuildTestShown, run: BuildTestRunShown): Personal => {
    sittings.current += 1;
    return { kind: 'run', test: { ...test, open: run }, run, sitting: sittings.current };
  }, []);

  const read = useCallback(
    async (retried = false): Promise<Personal> => {
      const [test, mine] = await Promise.all([readBuildTest(slug, kind, language), readBuildProjectMine(slug)]);
      // No test, and the person's side of the project read with no build in it: there is nothing to take yet.
      if (!test) return mine && !mine.builds.length ? { kind: 'no-build' } : { kind: 'failed' };
      const view = buildTestViewOf(test);
      const build = testBuildOf(mine, test);
      if (view.kind === 'question') return runOf(test, view.run);
      if (view.kind === 'result') {
        sittings.current += 1;
        return { kind: 'result', test, result: view.result, build, sitting: sittings.current };
      }
      if (view.kind === 'closed') return { kind: 'closed', test, build };
      // No run and no result, and a run can start: it starts now, on question 1.
      const started = await startBuildTestRun(slug, kind, language);
      if (started.ok) return runOf(test, started.data);
      // The test changed since it was read (another window): what stands is read once more.
      if (started.error === 'CONFLICT' && !retried) return read(true);
      // The session ended: the way back in, which returns to the test.
      if (started.error === 'SIGNED_OUT') return { kind: 'visitor' };
      return { kind: 'start-failed' };
    },
    [slug, kind, language, runOf],
  );

  const load = useCallback(async () => {
    setPersonal({ kind: 'pending' });
    setStartFailed(false);
    setNotice(null);
    setPersonal(await read());
  }, [read]);

  /**
   * An answer refused: given already (another window), or a run that ended or ran out. What stands is read again; when
   * the run is not the one on the page any more, one line says it ran out.
   */
  const refused = useCallback(
    async (run: string) => {
      setPersonal({ kind: 'pending' });
      setStartFailed(false);
      const next = await read();
      const moved =
        (next.kind === 'run' && next.run.run !== run) ||
        (next.kind === 'result' && next.result.run !== run) ||
        next.kind === 'closed';
      setNotice(moved ? RUN_EXPIRED_NOTE : null);
      setPersonal(next);
    },
    [read],
  );

  const signedOut = useCallback(() => {
    setNotice(null);
    setPersonal({ kind: 'visitor' });
  }, []);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    // A zone being saved first: the test's days and the zone are read in it.
    zoneSent()
      .then(() => Promise.all([read(), readBuildZone()]))
      .then(([next, zoneRead]) => {
        if (!live) return;
        setZone(zoneRead);
        setPersonal(next);
      });
    return () => {
      live = false;
    };
  }, [read]);

  /**
   * The tenth answer brought the result: it shows in place at once. Until the test and the build are read again (a
   * pass changes the build; the test says when the next try opens), a failed end test can be taken again at once and
   * a gold test waits, as the rules have it.
   */
  const showResult = useCallback(
    async (test: BuildTestShown, result: BuildTestResultShown) => {
      sittings.current += 1;
      const sitting = sittings.current;
      setNotice(null);
      const ended: BuildTestShown = {
        ...test,
        open: null,
        last: result,
        canStart: test.kind === 'end',
        nextTryAt: null,
      };
      setPersonal({ kind: 'result', test: ended, result, build: null, sitting });
      const [fresh, mine] = await Promise.all([readBuildTest(slug, kind, language), readBuildProjectMine(slug)]);
      const build = testBuildOf(mine, test);
      const read = fresh?.last?.run === result.run ? fresh : ended;
      setPersonal((now) => (now.kind === 'result' && now.sitting === sitting ? { ...now, test: read, build } : now));
    },
    [slug, kind, language],
  );

  /** "Take the test again": a new run, whose first question takes the result's place. */
  const again = useCallback(
    async (test: BuildTestShown) => {
      setStarting(true);
      setStartFailed(false);
      setNotice(null);
      const started = await startBuildTestRun(slug, kind, language);
      setStarting(false);
      if (started.ok) return setPersonal(runOf(test, started.data));
      if (started.error === 'CONFLICT') return load();
      if (started.error === 'SIGNED_OUT') return signedOut();
      setStartFailed(true);
    },
    [slug, kind, language, runOf, load, signedOut],
  );

  // Sent once the person's test was read, so the dates of this page and the API's days stay in one zone.
  useEffect(() => {
    if (['run', 'result', 'closed', 'no-build'].includes(personal.kind)) setKnown(true);
  }, [personal.kind]);
  const note = known ? <TimeZoneNote /> : null;

  if (personal.kind === 'run') {
    return (
      <>
        {note}
        <TestRun
          key={personal.sitting}
          project={project}
          test={personal.test}
          run={personal.run}
          notice={notice}
          onResult={(result) => showResult(personal.test, result)}
          onReload={load}
          onRefused={refused}
          onSignedOut={signedOut}
        />
      </>
    );
  }
  if (personal.kind === 'result') {
    return (
      <>
        {note}
        <TestFrame
          project={project}
          kind={kind}
          layout="page"
          end={<TestDoneEnd count={personal.result.items.length} />}
        >
          {notice ? <TestNotice text={notice} /> : null}
          <ResultView
            key={personal.sitting}
            project={project}
            test={personal.test}
            result={personal.result}
            build={personal.build}
            zone={zone}
            starting={starting}
            startFailed={startFailed}
            onAgain={() => again(personal.test)}
          />
        </TestFrame>
      </>
    );
  }
  if (personal.kind === 'pending') {
    return (
      <TestFrame project={project} kind={kind} layout="question">
        <TestPending />
      </TestFrame>
    );
  }
  return (
    <TestFrame project={project} kind={kind} layout="page">
      {note}
      <Still personal={personal} project={project} kind={kind} language={language} zone={zone} onReload={load} />
    </TestFrame>
  );
}

/** The pages with no question and no result: signing in, a read or a start that failed, and a test not open now. */
function Still({
  personal,
  project,
  kind,
  language,
  zone,
  onReload,
}: {
  personal: Exclude<Personal, { kind: 'run' | 'result' | 'pending' }>;
  project: BuildTestProject;
  kind: BuildTestKind;
  language: BuildLanguage | null;
  zone: string | undefined;
  onReload: () => void;
}) {
  const titleRef = useFocusOnShow<HTMLHeadingElement>(true);
  if (personal.kind === 'visitor') {
    return (
      <TestMessage
        state="visitor"
        titleRef={titleRef}
        title={`${TEST_NAMES[kind]} needs an account`}
        text="Sign in with GitHub to take it. It is the test of your own build of this project."
      >
        <Button
          type="button"
          size="lg"
          className="min-h-11 font-semibold sm:min-h-10"
          onClick={() => {
            signIn(IDENTITY_PROVIDER, { redirectTo: buildTestPath(project.slug, kind, language) }).catch(() => {});
          }}
        >
          Sign in with GitHub
        </Button>
      </TestMessage>
    );
  }
  if (personal.kind === 'no-build') {
    return (
      <TestMessage state="no-build" titleRef={titleRef} title={NO_BUILD_WORDS.title} text={NO_BUILD_WORDS.text}>
        <BackToProject project={project} main />
      </TestMessage>
    );
  }
  if (personal.kind === 'closed') {
    const words = closedWordsOf(personal.test, personal.build, zone);
    return (
      <TestMessage state="closed" titleRef={titleRef} title={words.title} text={words.text}>
        <BackToProject project={project} main />
      </TestMessage>
    );
  }
  const started = personal.kind === 'start-failed';
  return (
    <TestMessage
      state={personal.kind}
      titleRef={titleRef}
      title={started ? 'Your test did not start' : 'Your test did not load'}
      text={
        started
          ? 'We could not start it just now. Try again in a minute.'
          : 'We could not read it just now. The test is for your own build of this project, after its last step.'
      }
    >
      <Button type="button" size="lg" className="min-h-11 font-semibold sm:min-h-10" onClick={onReload}>
        Try again
      </Button>
      <BackToProject project={project} />
    </TestMessage>
  );
}

/** The result: the score, what comes now, and the answers, with the person's build when it could be read. */
function ResultView({
  project,
  test,
  result,
  build,
  zone,
  starting,
  startFailed,
  onAgain,
}: {
  project: BuildTestProject;
  test: BuildTestShown;
  result: BuildTestResultShown;
  build: BuildMine | null;
  zone: string | undefined;
  starting: boolean;
  startFailed: boolean;
  onAgain: () => void;
}) {
  const titleRef = useFocusOnShow<HTMLHeadingElement>(true);
  const groups = useMemo(() => answerGroupsOf(result, test.language), [result, test.language]);
  const box = testBoxOf(test, result, build, new Date(), zone);
  return (
    <TestResult
      title={scoreTitleOf(test, result)}
      passed={result.passed}
      text={scoreTextOf(test, result, project)}
      box={box}
      project={project}
      goldHref={buildTestPath(project.slug, 'gold', test.language)}
      wrong={groups.wrong}
      right={groups.right}
      titleRef={titleRef}
      starting={starting}
      startFailed={startFailed}
      onAgain={onAgain}
    />
  );
}

/**
 * The run: the questions still to answer, one after another, each sent as given and never graded here. There is no
 * way back to an earlier question. The tenth answer brings the result; an answer refused as given already, or a run
 * that ended elsewhere, reads the test again.
 */
function TestRun({
  project,
  test,
  run,
  notice,
  onResult,
  onReload,
  onRefused,
  onSignedOut,
}: {
  project: BuildTestProject;
  test: BuildTestShown;
  run: BuildTestRunShown;
  /** One line above the question, when the run on the page before ran out. */
  notice: string | null;
  onResult: (result: BuildTestResultShown) => void;
  onReload: () => void;
  onRefused: (run: string) => void;
  onSignedOut: () => void;
}) {
  const count = run.questions.length;
  const answered = Math.min(run.answered, count);
  const player = usePlayer(count, {
    at: answered,
    results: Array.from({ length: answered }, (): PlayerResult => 'answered'),
  });
  const at = player.run.at;
  const question: LearnQuestion | undefined = run.questions[at];
  const cardRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const resulted = useRef(false);

  // Past the last question with no result in hand: the test is read again, once.
  const ending = useRef(false);
  useEffect(() => {
    if (ending.current || resulted.current) return;
    if (player.over || !question) {
      ending.current = true;
      onReload();
    }
  }, [player.over, question, onReload]);

  // Each new question takes the focus, so a screen reader starts at its card; the first one is where the page opened.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the question changes.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    cardRef.current?.focus();
  }, [at]);

  const end = <PlayerRunEnd squares={player.squares} words={runWordsOf('Question', player.run)} />;
  if (player.over || !question) {
    return (
      <TestFrame project={project} kind={test.kind} layout="question" end={end}>
        <TestPending />
      </TestFrame>
    );
  }
  return (
    <TestFrame project={project} kind={test.kind} layout="question" end={end}>
      {notice ? <TestNotice text={notice} /> : null}
      <h1 className="sr-only">
        {TEST_NAMES[test.kind]} of {project.name}
      </h1>
      <section
        ref={cardRef}
        tabIndex={-1}
        className="flex flex-col gap-4 outline-none"
        aria-label={`Question ${at + 1} of ${count}`}
      >
        <RunQuestion
          key={question.id}
          project={project}
          test={test}
          run={run}
          question={question}
          count={count}
          last={at === count - 1}
          onAnswered={() => player.record('answered')}
          onNext={player.next}
          onResult={(result) => {
            resulted.current = true;
            onResult(result);
          }}
          onConflict={() => onRefused(run.run)}
          onSignedOut={onSignedOut}
        />
      </section>
    </TestFrame>
  );
}

/** One question: its pick is sent as the option's place in the run's order, or null for "I don't know". */
function RunQuestion({
  project,
  test,
  run,
  question,
  count,
  last,
  onAnswered,
  onNext,
  onResult,
  onConflict,
  onSignedOut,
}: {
  project: BuildTestProject;
  test: BuildTestShown;
  run: BuildTestRunShown;
  question: LearnQuestion;
  count: number;
  last: boolean;
  onAnswered: () => void;
  onNext: () => void;
  onResult: (result: BuildTestResultShown) => void;
  onConflict: () => void;
  onSignedOut: () => void;
}) {
  const answer = useLearnAnswer({
    question,
    language: test.language,
    extra: true,
    verdict: false,
    send: async ({ picked, extra }) => {
      // A test asks pick one and predict the output only: one option, by its place.
      if (!extra && typeof picked !== 'number') return null;
      const sent = await answerBuildTestRun(run.run, question.id, extra ? null : (picked as number));
      if (!sent.ok) {
        // Answered in another window, or a run that ended or expired: what stands is read again.
        if (sent.error === 'CONFLICT' || sent.error === 'NOT_FOUND') onConflict();
        // The session ended: the way back in, which returns to the test and its run.
        if (sent.error === 'SIGNED_OUT') onSignedOut();
        return null;
      }
      onAnswered();
      if (sent.data.result) onResult(sent.data.result);
      return { right: false };
    },
    onDone: onNext,
  });
  return (
    <TestQuestion
      test={test}
      question={question}
      answer={answer}
      count={count}
      last={last}
      highlighted={run.highlighted?.[question.id]}
      project={project}
    />
  );
}
