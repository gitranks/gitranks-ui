'use client';

import { signIn } from 'next-auth/react';
import { type Ref, useCallback, useEffect, useRef, useState } from 'react';

import {
  CoursesLine,
  CoursesList,
  DaysBoxView,
  HistoryFailed,
  HistoryList,
  type HistoryMore,
  HistoryPending,
  LessonsBoxView,
  MY_PROGRESS_MAIN_CLASS,
  ProgressEmpty,
  ProgressFailed,
  ProgressPending,
  ProgressVisitor,
  ViewHead,
} from './my-progress-parts';
import { useFocusOnShow } from '@/components/learn/player/use-page-keys';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import {
  calendarOf,
  daysLineOf,
  historyAfter,
  historyBeforeOf,
  isEmptyProgress,
  type LearnDay,
  type LearnHistory,
  type LearnMyProgress,
  learnDayOfDate,
  lessonsBoxOf,
  type MyProgressView,
  myProgressPath,
} from '@/lib/learn/my-progress';
import { LEARN_MY_PROGRESS_MINE_PATH, learnHistoryMinePath } from '@/lib/learn/paths';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's progress from its route: `'signed-out'` when the session is gone; null on any failure. */
export async function readMyProgress(): Promise<LearnMyProgress | 'signed-out' | null> {
  try {
    const res = await fetch(LEARN_MY_PROGRESS_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    const { progress, signedOut } = (await res.json()) as { progress?: LearnMyProgress | null; signedOut?: boolean };
    if (signedOut === true) return 'signed-out';
    return progress ?? null;
  } catch {
    return null;
  }
}

/** A page of the person's History from its route, the days before `before`; as `readMyProgress` answers. */
export async function readHistory(before: string | null): Promise<LearnHistory | 'signed-out' | null> {
  try {
    const res = await fetch(learnHistoryMinePath(before), { cache: 'no-store' });
    if (!res.ok) return null;
    const { history, signedOut } = (await res.json()) as { history?: LearnHistory | null; signedOut?: boolean };
    if (signedOut === true) return 'signed-out';
    return history ?? null;
  } catch {
    return null;
  }
}

type Page =
  | { kind: 'pending' }
  | { kind: 'visitor' }
  | { kind: 'ended' }
  | { kind: 'failed' }
  | { kind: 'ready'; progress: LearnMyProgress; today: string };

/** History as the page holds it: opened at a day or at the newest, and how far it was read. */
export type MyProgressHistory =
  | { kind: 'pending'; from: string | null }
  | { kind: 'failed'; from: string | null }
  | { kind: 'ready'; from: string | null; days: LearnDay[]; more: HistoryMore; focus: string | null };

/**
 * My progress in the browser (page 18). The page is the person's own: once it is up, a person with a session reads
 * their progress, and a visitor is asked to sign in. History is read when its view is opened, twenty days at a time,
 * from the day a square of "Days" opened or from the newest; "Show earlier days" adds the next ones in place, the focus
 * on the first of them. Switching views keeps what was read.
 */
export function MyProgressLive({ view, day }: { view: MyProgressView; day: string | null }) {
  const [page, setPage] = useState<Page>({ kind: 'pending' });
  const [history, setHistory] = useState<MyProgressHistory | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [historyAttempt, setHistoryAttempt] = useState(0);
  const message = page.kind === 'visitor' || page.kind === 'ended' || page.kind === 'failed';
  const titleRef = useFocusOnShow<HTMLHeadingElement>(message);
  // After "Try again" the button is gone: the page's own title takes the focus once the progress is back.
  const pageTitleRef = useFocusOnShow<HTMLHeadingElement>(page.kind === 'ready' && attempt > 0);
  const dayTitleRef = useRef<HTMLHeadingElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Try again reads the progress once more.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setPage({ kind: 'visitor' });
      return;
    }
    let live = true;
    readMyProgress().then((progress) => {
      if (!live) return;
      if (progress === 'signed-out') setPage({ kind: 'ended' });
      else if (!progress) setPage({ kind: 'failed' });
      else setPage({ kind: 'ready', progress, today: learnDayOfDate(new Date()) });
    });
    return () => {
      live = false;
    };
  }, [attempt]);

  const ready = page.kind === 'ready';
  const historyFrom = history?.from ?? null;
  const historyKind = history?.kind ?? null;
  // History's first page, read when its view opens and again when a square opens another day.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Try again reads the first page once more.
  useEffect(() => {
    if (!ready || view !== 'history') return;
    if (historyKind !== null && historyKind !== 'failed' && historyFrom === day) return;
    let live = true;
    setHistory({ kind: 'pending', from: day });
    readHistory(historyBeforeOf(day)).then((read) => {
      if (!live) return;
      if (read === 'signed-out') setPage({ kind: 'ended' });
      else if (!read) setHistory({ kind: 'failed', from: day });
      else setHistory({ kind: 'ready', from: day, days: read.days, more: read.more ? 'more' : 'end', focus: day });
    });
    return () => {
      live = false;
    };
  }, [ready, view, day, historyAttempt]);

  // The day to show takes the focus once it is drawn: the day a square opened, or the first of the days added.
  const focusDay = history?.kind === 'ready' ? history.focus : null;
  useEffect(() => {
    if (focusDay) dayTitleRef.current?.focus();
  }, [focusDay]);

  const showEarlier = useCallback(async () => {
    if (history?.kind !== 'ready' || history.more === 'loading' || history.more === 'end') return;
    const oldest = history.days.at(-1)?.day ?? null;
    setHistory({ ...history, more: 'loading', focus: null });
    const read = await readHistory(oldest);
    if (read === 'signed-out') {
      setPage({ kind: 'ended' });
      return;
    }
    setHistory((current) => {
      if (current?.kind !== 'ready') return current;
      if (!read) return { ...current, more: 'failed' };
      const days = historyAfter(current.days, read.days);
      const first = days[current.days.length]?.day ?? null;
      return { ...current, days, more: read.more ? 'more' : 'end', focus: first };
    });
  }, [history]);

  const signInHere = useCallback(() => {
    signIn(IDENTITY_PROVIDER, { redirectTo: myProgressPath({ view }) }).catch(() => {});
  }, [view]);

  return (
    <main className={MY_PROGRESS_MAIN_CLASS}>
      {page.kind === 'visitor' || page.kind === 'ended' ? (
        <ProgressVisitor ended={page.kind === 'ended'} titleRef={titleRef} onSignIn={signInHere} />
      ) : page.kind === 'failed' ? (
        <ProgressFailed
          titleRef={titleRef}
          onReload={() => {
            setPage({ kind: 'pending' });
            setAttempt((count) => count + 1);
          }}
        />
      ) : page.kind === 'pending' ? (
        <>
          <h1 className="sr-only">Your progress</h1>
          <ProgressPending />
        </>
      ) : isEmptyProgress(page.progress) ? (
        <ProgressEmpty titleRef={pageTitleRef} />
      ) : (
        <>
          <h1 ref={pageTitleRef} tabIndex={-1} className="sr-only">
            Your progress
          </h1>
          <ProgressBody
            progress={page.progress}
            today={page.today}
            view={view}
            history={history}
            onMore={() => void showEarlier()}
            onHistoryReload={() => setHistoryAttempt((count) => count + 1)}
            dayTitleRef={dayTitleRef}
          />
        </>
      )}
    </main>
  );
}

/** The boxes, the switch, and the view: the page once the person's progress is in. */
export function ProgressBody({
  progress,
  today,
  view,
  history,
  onMore,
  onHistoryReload,
  dayTitleRef,
}: {
  progress: LearnMyProgress;
  today: string;
  view: MyProgressView;
  history: MyProgressHistory | null;
  onMore: () => void;
  onHistoryReload: () => void;
  dayTitleRef?: Ref<HTMLHeadingElement>;
}) {
  const box = lessonsBoxOf(progress);
  const line = daysLineOf(progress, today);
  // History's line: since the first day, when the calendar holds every day counted.
  const historySince = line.kind === 'days' ? line.since : null;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {box ? <LessonsBoxView box={box} /> : null}
        <DaysBoxView calendar={calendarOf(progress.days, today)} line={line} today={today} />
      </div>
      {view === 'courses' ? (
        <>
          <ViewHead view={view} line={<CoursesLine courses={progress.courses} />} />
          <CoursesList courses={progress.courses} today={today} />
        </>
      ) : (
        <>
          <ViewHead view={view} line={historySince ? `Since ${historySince}` : null} />
          {history?.kind === 'ready' ? (
            <HistoryList
              days={history.days}
              today={today}
              more={history.more}
              from={history.from}
              onMore={onMore}
              dayRef={history.focus && dayTitleRef ? { day: history.focus, ref: dayTitleRef } : null}
            />
          ) : history?.kind === 'failed' ? (
            <HistoryFailed onReload={onHistoryReload} />
          ) : (
            <HistoryPending />
          )}
        </>
      )}
    </>
  );
}
