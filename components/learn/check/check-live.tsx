'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type CardAction,
  CheckFrame,
  CheckMessage,
  type CheckMode,
  CheckPending,
  CheckQuestionCard,
  checkResultEndOf,
  KnownCard,
  KnownList,
  KnownSheet,
} from './check-parts';
import { useEnter, useFocusOnShow } from '@/components/learn/player/use-page-keys';
import { type LearnAnswer, useLearnAnswer } from '@/components/learn/question/use-learn-answer';
import { Button } from '@/components/ui/button';
import { PlayerRunEnd } from '@/components/workspace/player/player-strip';
import { usePlayer } from '@/components/workspace/player/use-player';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import {
  type CheckQuestionShown,
  type CheckSide,
  checkIntroOf,
  checkTitleOf,
  checkVisitorTextOf,
  handWordsOf,
  type KnownGroup,
  keptKnownOf,
  knownCountsOf,
  knownGroupsOfCourse,
  knownGroupsOfResult,
  knownSlugsOf,
  type LearnCheckGroup,
  type SheetDoes,
  sheetActionsOf,
  startOf,
  tickedFirstOf,
  toggledGroupOf,
  toggledLessonOf,
} from '@/lib/learn/check';
import { answerLearnCheckAction, saveLearnKnownAction, stopLearnCheckAction } from '@/lib/learn/check.actions';
import type { LearnCourse, LearnCourseMine } from '@/lib/learn/course';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import {
  checkPath,
  coursePath,
  LEARN_COURSES_PATH,
  learnCheckMinePath,
  learnCourseMinePath,
  learnKnownPath,
  learnLessonPath,
} from '@/lib/learn/paths';
import { MainLanguageContext, useExampleLanguage } from '@/lib/learn/use-example-language';
import { useLearnSetupGuess } from '@/lib/learn/use-setup-guess';
import { hasSessionHint } from '@/lib/session-hint';
import { runWordsOf } from '@/lib/workspace/player';
import { useKeyHints } from '@/lib/workspace/use-key-hints';

/** The person's run from its route: the run, or none (with `missing` when the course offers no check). */
export async function readCheckSide(
  course: string,
): Promise<{ check: CheckSide | null; missing: boolean; mainLanguage: string | null } | null> {
  try {
    const res = await fetch(learnCheckMinePath(course), { cache: 'no-store' });
    if (!res.ok) return null;
    const { check, missing, mainLanguage } = (await res.json()) as {
      check?: CheckSide | null;
      missing?: unknown;
      mainLanguage?: unknown;
    };
    const main = typeof mainLanguage === 'string' && mainLanguage ? mainLanguage : null;
    if (missing === true) return { check: null, missing: true, mainLanguage: main };
    // Only a whole run is drawn.
    if (!check || typeof check.id !== 'string' || !Array.isArray(check.questions)) return null;
    return { check, missing: false, mainLanguage: main };
  } catch {
    return null;
  }
}

/** The person's side of the course, for "What you know": null when there is none, and on any failure. */
export async function readKnownSide(course: string): Promise<LearnCourseMine | null> {
  try {
    const res = await fetch(learnCourseMinePath(course), { cache: 'no-store' });
    if (!res.ok) return null;
    const { course: mine } = (await res.json()) as { course?: LearnCourseMine | null };
    return mine && mine.slug === course && Array.isArray(mine.lessons) ? mine : null;
  } catch {
    return null;
  }
}

/** Where the page stands: not known yet, a visitor, a read that failed, no check offered, the run, or the sheet. */
type Personal =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'failed' }
  | { kind: 'missing' }
  | { kind: 'run'; check: CheckSide; sitting: number; mainLanguage: string | null }
  | { kind: 'sheet'; groups: KnownGroup[]; kept: string[]; check: string | null; sitting: number };

/**
 * A course's check in the browser (page 17), or with `mode` "known", "What you know". The page is the person's own:
 * once it is up, a person with a session reads their run (or their marks), and a visitor is asked to sign in. The run
 * asks each group's question once with no right or wrong, then the result proposes what they know; nothing is marked
 * until they save it. A course that offers no check, or stops offering it during the run, says so.
 */
export function CheckLive({ course, mode }: { course: LearnCourse; mode: CheckMode }) {
  useLearnSetupGuess();
  const offered = mode === 'known' || course.checkOffered;
  const [personal, setPersonal] = useState<Personal>({ kind: offered ? 'pending' : 'missing' });
  const [result, setResult] = useState<readonly LearnCheckGroup[] | null>(null);
  const sittings = useRef(0);
  const { slug } = course;
  const link = useMemo(() => ({ slug: course.slug, title: course.name }), [course.slug, course.name]);

  /**
   * The check's result as a sheet, with the person's marks on the lessons it does not show (paused ones), which its
   * save sends as they are. Without those marks nothing is drawn: a save would remove them.
   */
  const resultSheetOf = useCallback(
    async (check: string, groups: LearnCheckGroup[], sitting: number): Promise<Personal> => {
      const mine = await readKnownSide(slug);
      if (!mine) return { kind: 'failed' };
      const sheet = knownGroupsOfResult(groups);
      setResult(groups);
      return { kind: 'sheet', groups: sheet, kept: keptKnownOf(course, mine, sheet), check, sitting };
    },
    [slug, course],
  );

  const read = useCallback(async (): Promise<Personal> => {
    sittings.current += 1;
    const sitting = sittings.current;
    if (mode === 'known') {
      const mine = await readKnownSide(slug);
      if (!mine) return { kind: 'failed' };
      const groups = knownGroupsOfCourse(course, mine);
      return { kind: 'sheet', groups, kept: keptKnownOf(course, mine, groups), check: null, sitting };
    }
    const side = await readCheckSide(slug);
    if (!side) return { kind: 'failed' };
    if (side.missing || !side.check) return { kind: 'missing' };
    if (side.check.result) return resultSheetOf(side.check.id, side.check.result, sitting);
    return { kind: 'run', check: side.check, sitting, mainLanguage: side.mainLanguage };
  }, [mode, slug, course, resultSheetOf]);

  const load = useCallback(async () => {
    setPersonal({ kind: 'pending' });
    setPersonal(await read());
  }, [read]);

  useEffect(() => {
    // A check not offered asks nothing: the page says so to everyone.
    if (!offered) return;
    if (!hasSessionHint(document.cookie)) {
      setPersonal({ kind: 'visitor' });
      return;
    }
    let live = true;
    read().then((next) => {
      if (live) setPersonal(next);
    });
    return () => {
      live = false;
    };
  }, [read, offered]);

  /** The course stopped offering its check during the run: the page says so, and leads back to the course. */
  const withdrawn = useCallback(() => setPersonal({ kind: 'missing' }), []);

  /** The run ended: its result, as "Stop and see the result" answers it, with the person's marks it does not show. */
  const showResult = useCallback(
    async (check: { id: string; result: LearnCheckGroup[] | null }) => {
      if (!check.result) return;
      sittings.current += 1;
      setPersonal(await resultSheetOf(check.id, check.result, sittings.current));
    },
    [resultSheetOf],
  );

  if (personal.kind === 'run') {
    return (
      // Each question's code opens in the person's main language, when the course has it.
      <MainLanguageContext value={personal.mainLanguage}>
        <CheckRun
          key={personal.sitting}
          course={link}
          check={personal.check}
          onResult={showResult}
          onReload={load}
          onWithdrawn={withdrawn}
        />
      </MainLanguageContext>
    );
  }
  if (personal.kind === 'sheet') {
    return (
      <CheckFrame
        course={link}
        mode={mode}
        wide
        end={result && mode === 'check' ? checkResultEndOf(result) : undefined}
      >
        <CheckSheet
          key={personal.sitting}
          mode={mode}
          course={link}
          groups={personal.groups}
          kept={personal.kept}
          check={personal.check}
          onReload={load}
        />
      </CheckFrame>
    );
  }
  return (
    <CheckFrame course={link} mode={mode}>
      <CheckStill personal={personal} course={course} mode={mode} onReload={load} />
    </CheckFrame>
  );
}

/** The pages with no question and no sheet: waiting, signing in, a read that failed, and no check offered. */
function CheckStill({
  personal,
  course,
  mode,
  onReload,
}: {
  personal: Personal;
  course: LearnCourse;
  mode: CheckMode;
  onReload: () => void;
}) {
  const titleRef = useFocusOnShow<HTMLHeadingElement>(personal.kind !== 'pending');
  if (personal.kind === 'visitor') {
    return (
      <CheckMessage
        state="visitor"
        titleRef={titleRef}
        title={mode === 'known' ? 'What you know needs an account' : 'The check needs an account'}
        text={
          mode === 'known'
            ? 'It keeps the lessons you already know, so you start further in. Without an account there is nowhere to keep them.'
            : checkVisitorTextOf(course)
        }
      >
        <Button
          type="button"
          size="lg"
          className="min-h-11 font-semibold"
          onClick={() => {
            const back = mode === 'known' ? learnKnownPath(course.slug) : checkPath(course.slug);
            signIn(IDENTITY_PROVIDER, { redirectTo: back }).catch(() => {});
          }}
        >
          Sign in with GitHub
        </Button>
      </CheckMessage>
    );
  }
  if (personal.kind === 'failed') {
    return (
      <CheckMessage
        state="failed"
        titleRef={titleRef}
        title={mode === 'known' ? 'What you know did not load' : 'Your check did not load'}
        text="Your progress is safe; we could not read it just now. Try again in a minute."
      >
        <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onReload}>
          Try again
        </Button>
      </CheckMessage>
    );
  }
  if (personal.kind === 'missing') {
    return (
      <CheckMessage
        state="missing"
        titleRef={titleRef}
        title="This course has no check just now"
        text="The check comes back once every group of the course is open again. Its lessons are still open to you."
      >
        <Button asChild size="lg" className="min-h-11 font-semibold">
          <Link href={coursePath(course.slug)}>Back to the course</Link>
        </Button>
      </CheckMessage>
    );
  }
  return <CheckPending />;
}

/**
 * The run: the questions still to answer, one after another, each sent as given and never graded here. The last one,
 * or "Stop and see the result", ends the run; the result is then read. An answer refused as given already, or a run
 * that ended elsewhere, reads the run again.
 */
function CheckRun({
  course,
  check,
  onResult,
  onReload,
  onWithdrawn,
}: {
  course: LearnLessonLink;
  check: CheckSide;
  onResult: (check: { id: string; result: LearnCheckGroup[] | null }) => void;
  onReload: () => void;
  onWithdrawn: () => void;
}) {
  const count = check.questions.length;
  const left = useMemo(() => check.questions.filter((asked) => !asked.answered), [check.questions]);
  const answered = count - left.length;
  const player = usePlayer(count, {
    at: answered,
    results: Array.from({ length: answered }, () => 'answered' as const),
  });
  const [stopping, setStopping] = useState(false);
  const [stopFailed, setStopFailed] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const at = player.run.at;
  const asked: CheckQuestionShown | undefined = left[at - answered];

  // Nothing left to ask when the run was read: it is ended here, never read again by itself.
  const nothingLeft = left.length === 0;
  // Once "Stop and see the result" is pressed, an answer refused on its way changes nothing: the result is coming.
  const stopped = useRef(false);
  const stop = useCallback(async () => {
    stopped.current = true;
    setStopping(true);
    setStopFailed(false);
    const ended = await stopLearnCheckAction(course.slug);
    if (ended.ok && ended.data?.result) return onResult(ended.data);
    // The course stopped offering its check: trying again cannot help.
    if (!ended.ok && ended.error === 'NOT_FOUND') return onWithdrawn();
    // Ended already (the last answer, or another window): what stands is read again.
    if (!ended.ok && ended.error === 'CONFLICT' && !nothingLeft) return onReload();
    stopped.current = false;
    setStopping(false);
    setStopFailed(true);
  }, [course.slug, nothingLeft, onResult, onReload, onWithdrawn]);
  const conflict = useCallback(() => {
    if (!stopped.current) onReload();
  }, [onReload]);

  // Past the last question the run ended: its result is read. A run with nothing left to ask that has not ended is
  // ended here, once.
  const ending = useRef(false);
  useEffect(() => {
    if (ending.current) return;
    if (nothingLeft) {
      ending.current = true;
      void stop();
    } else if (player.over || !asked) {
      ending.current = true;
      onReload();
    }
  }, [nothingLeft, player.over, asked, onReload, stop]);

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
  if (player.over || !asked) {
    return (
      <CheckFrame course={course} mode="check" end={end}>
        {stopFailed ? (
          <CheckMessage
            state="failed"
            title="Your result did not load"
            text="Your answers are kept; we could not read the result just now. Try again in a minute."
          >
            <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onReload}>
              Try again
            </Button>
          </CheckMessage>
        ) : (
          <CheckPending />
        )}
      </CheckFrame>
    );
  }
  return (
    <CheckFrame course={course} mode="check" end={end}>
      <h1 className="sr-only">The check of {course.title}</h1>
      <section
        ref={cardRef}
        tabIndex={-1}
        className="flex flex-col gap-4 outline-none"
        aria-label={`Question ${at + 1} of ${count}`}
      >
        <CheckQuestion
          // A question's id is only its lesson's own (every check question is `c1`): the group names the question, so
          // each one starts with a fresh answer.
          key={asked.group.slug}
          course={course.slug}
          asked={asked}
          last={at === count - 1}
          stopping={stopping}
          onStop={stop}
          onConflict={conflict}
          onWithdrawn={onWithdrawn}
          onAnswered={() => player.record('answered')}
          onNext={player.next}
        />
        {stopFailed ? (
          <p className="m-0 text-sm text-warning-soft-foreground" role="alert" data-check-stop-failed="">
            <b className="font-semibold">The result did not load.</b> Your answers are kept. Try again.
          </p>
        ) : null}
      </section>
    </CheckFrame>
  );
}

/** The answer while the run is being stopped: nothing picks, and nothing is sent. */
function frozenOf(answer: LearnAnswer): LearnAnswer {
  const none = () => {};
  return { ...answer, canSend: false, pick: none, extra: none, myth: none, move: none, step: none, main: none };
}

/**
 * One question: its answer is sent as the person's, and the run goes on with no verdict. While the run is being
 * stopped, the question takes no keys and no presses.
 */
function CheckQuestion({
  course,
  asked,
  last,
  stopping,
  onStop,
  onConflict,
  onWithdrawn,
  onAnswered,
  onNext,
}: {
  course: string;
  asked: CheckQuestionShown;
  last: boolean;
  stopping: boolean;
  onStop: () => void;
  onConflict: () => void;
  onWithdrawn: () => void;
  onAnswered: () => void;
  onNext: () => void;
}) {
  const [language] = useExampleLanguage(asked.question.codes.map((code) => code.language));
  const answer = useLearnAnswer({
    question: asked.question,
    language,
    extra: true,
    verdict: false,
    keys: !stopping,
    send: async ({ picked, extra, language: sentIn }) => {
      const sent = await answerLearnCheckAction({
        course,
        group: asked.group.slug,
        picked,
        dontKnow: extra,
        language: sentIn,
      });
      if (!sent.ok) {
        // Answered in another window, or a run that ended: what stands is read again.
        if (sent.error === 'CONFLICT') onConflict();
        // The course stopped offering its check: trying again cannot help.
        if (sent.error === 'NOT_FOUND') onWithdrawn();
        return null;
      }
      if (sent.data !== true) return null;
      onAnswered();
      return { right: false };
    },
    onDone: onNext,
  });
  return (
    <CheckQuestionCard
      asked={asked}
      answer={stopping ? frozenOf(answer) : answer}
      last={last}
      stopping={stopping}
      onStop={onStop}
    />
  );
}

/**
 * The sheet: the check's result, or "What you know". The person ticks and unticks groups and lessons; nothing is saved
 * until they press the button, which saves and takes them where they start.
 */
function CheckSheet({
  mode,
  course,
  groups,
  kept,
  check,
  onReload,
}: {
  mode: CheckMode;
  course: LearnLessonLink;
  groups: KnownGroup[];
  /** Marks the sheet does not show (paused lessons'), saved as they are. */
  kept: readonly string[];
  check: string | null;
  onReload: () => void;
}) {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => tickedFirstOf(groups));
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const hints = useKeyHints();
  const router = useRouter();
  const titleRef = useFocusOnShow<HTMLHeadingElement>(true);

  const counts = knownCountsOf(groups, ticked);
  const start = startOf(groups, ticked);
  const firstLesson = startOf(groups, new Set());

  /** Saves `known`, then goes where `then` says, from what the save answered. */
  const save = useCallback(
    async (known: string[], then: (saved: LearnLessonLink | null) => string) => {
      setSaving(true);
      setFailed(false);
      const saved = await saveLearnKnownAction({ course: course.slug, known, check });
      if (saved.ok && saved.data) return router.push(then(saved.data.start) as never);
      // A result saved already (another window): what stands is read again.
      if (!saved.ok && saved.error === 'CONFLICT') return onReload();
      setSaving(false);
      setFailed(true);
    },
    [course.slug, check, router, onReload],
  );

  const known = [...knownSlugsOf(groups, ticked), ...kept];
  const lessonOr = (fallback: LearnLessonLink | null) => (saved: LearnLessonLink | null) => {
    const at = saved ?? fallback;
    return at ? learnLessonPath(at.slug) : coursePath(course.slug);
  };
  const acts: Record<SheetDoes, () => void> = {
    save: () => save(known, () => coursePath(course.slug)),
    'save-and-pick': () => save(known, () => LEARN_COURSES_PATH),
    'start-first': () => save([...kept], lessonOr(start)),
    'save-and-start': () => save(known, lessonOr(start)),
    'mark-nothing': () => save([...kept], lessonOr(firstLesson)),
  };
  const actions = sheetActionsOf(mode, groups, ticked);
  const primary: CardAction = { label: actions.primary.label, act: acts[actions.primary.does] };
  const secondary: CardAction | null = actions.secondary
    ? { label: actions.secondary.label, act: acts[actions.secondary.does] }
    : null;
  useEnter(saving ? null : primary.act);

  const list = (
    <KnownList
      groups={groups}
      ticked={ticked}
      opened={opened}
      onGroup={(group) => setTicked((now) => toggledGroupOf(group, now))}
      onLesson={(lesson) => setTicked((now) => toggledLessonOf(lesson, now))}
      onOpen={(group, open) =>
        setOpened((now) => {
          const next = new Set(now);
          if (open) next.add(group.slug);
          else next.delete(group.slug);
          return next;
        })
      }
    />
  );
  const card = (
    <KnownCard
      mode={mode}
      counts={counts}
      start={start}
      hand={mode === 'check' ? handWordsOf(groups, ticked) : null}
      primary={primary}
      secondary={secondary}
      hints={hints}
      saving={saving}
      failed={failed}
    />
  );
  return mode === 'known' ? (
    <KnownSheet
      state="known"
      titleRef={titleRef}
      title="What you already know in this course"
      intro="Tick the lessons you know without answering them, or untick the ones you want to learn after all. A lesson you learned by answering stays learned."
      list={list}
      card={card}
    />
  ) : (
    <KnownSheet
      state="result"
      titleRef={titleRef}
      title={checkTitleOf(groups)}
      intro={checkIntroOf(groups)}
      list={list}
      card={card}
    />
  );
}
