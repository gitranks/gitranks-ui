import type { ReactNode } from 'react';

import { Header } from '@/components/header/header';
import { LearnBar } from '@/components/learn/bar/learn-bar';
import { type MyProgressHistory, ProgressBody } from '@/components/learn/my-progress/my-progress-live';
import {
  DaysBoxView,
  HistoryFailed,
  HistoryList,
  HistoryPending,
  LessonsBoxView,
  MY_PROGRESS_MAIN_CLASS,
  ProgressEmpty,
  ProgressFailed,
  ProgressPending,
  ProgressVisitor,
  ViewHead,
} from '@/components/learn/my-progress/my-progress-parts';
import {
  historyEarlier,
  historyFirst,
  myProgress,
  myProgressFirstDay,
  myProgressKnownOnly,
  myProgressLong,
  PROGRESS_TODAY,
} from '@/lib/learn/__fixtures__/my-progress';
import type { LearnBarState } from '@/lib/learn/learn-bar';
import {
  calendarOf,
  daysLineOf,
  type LearnMyProgress,
  lessonsBoxOf,
  type MyProgressView,
} from '@/lib/learn/my-progress';

/*
 * My progress (page 18), as its route draws it, from fixtures and on the boards' own day (Sunday 22 Nov 2026). The
 * states sit on boards that already exist: the frame's board draws them at full width, and the phone board of all
 * courses draws the page on a phone.
 */

const noop = () => {};

/** The sources that draw My progress, for the boards that show it. */
export const MY_PROGRESS_SOURCES = [
  'components/learn/my-progress/my-progress-parts.tsx',
  'components/learn/my-progress/my-progress-live.tsx',
  'lib/learn/my-progress.ts',
  'app/(learn)/learn/progress/page.tsx',
];

const LEARNER_BAR: LearnBarState = { kind: 'learner', due: 6, pullRequests: false, pullRequestsNeedYou: 0 };
const VISITOR_BAR: LearnBarState = { kind: 'visitor' };

/** One state: its name, then Learn's bar with Progress current and the page, cut at `height`. */
export function ProgressFrame({
  title,
  height,
  bar = LEARNER_BAR,
  header = false,
  children,
}: {
  title: string;
  height: number;
  bar?: LearnBarState;
  /** The site's header above the bar, as on a phone board. */
  header?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-semibold">{title}</span>
      <div
        className={
          header
            ? 'overflow-hidden rounded-xl border bg-background'
            : 'overflow-hidden rounded-xl border bg-background pt-2.5'
        }
        style={{ height }}
      >
        {header ? <Header section="learn" /> : null}
        <LearnBar state={bar} place="progress" />
        <div className={MY_PROGRESS_MAIN_CLASS}>{children}</div>
      </div>
    </section>
  );
}

const history = (patch: Partial<Extract<MyProgressHistory, { kind: 'ready' }>> = {}): MyProgressHistory => ({
  kind: 'ready',
  from: null,
  days: historyFirst.days,
  more: 'more',
  focus: null,
  ...patch,
});

function Body({
  progress = myProgress,
  view = 'courses',
  shown = null,
}: {
  progress?: LearnMyProgress;
  view?: MyProgressView;
  shown?: MyProgressHistory | null;
}) {
  return (
    <ProgressBody
      progress={progress}
      today={PROGRESS_TODAY}
      view={view}
      history={shown}
      onMore={noop}
      onHistoryReload={noop}
    />
  );
}

/** Only the part under the boxes, which stay the same in every view: History's head line and the switch, then `children`. */
function UnderTheBoxes({ children }: { children: ReactNode }) {
  return (
    <>
      <ViewHead view="history" line="Since 8 Jun" />
      {children}
    </>
  );
}

/** Every state of My progress at full width, for the frame's board. */
export function MyProgressStates() {
  const box = lessonsBoxOf(myProgress);
  return (
    <>
      <ProgressFrame title="1 · Courses: the two boxes, then a card for each course started" height={800}>
        <Body />
      </ProgressFrame>
      <ProgressFrame title="2 · History: one group a day, newest first, the review first" height={1240}>
        <Body view="history" shown={history()} />
      </ProgressFrame>
      <ProgressFrame
        title="3 · A square of “Days” opened its day in History, and “Show earlier days” added the next ones in place"
        height={1180}
      >
        <Body
          view="history"
          shown={history({
            from: '2026-11-20',
            days: [...historyFirst.days.slice(2), ...historyEarlier.days],
            more: 'end',
          })}
        />
      </ProgressFrame>
      <ProgressFrame title="4 · Pointing at a square of “Days”: a small card says what was done that day" height={490}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {box ? <LessonsBoxView box={box} /> : null}
          <DaysBoxView
            calendar={calendarOf(myProgress.days, PROGRESS_TODAY)}
            line={daysLineOf(myProgress, PROGRESS_TODAY)}
            today={PROGRESS_TODAY}
            pointed="2026-11-20"
          />
        </div>
      </ProgressFrame>
      <ProgressFrame
        title="5 · Learning since before the calendar's 26 weeks: the days counted, with no first day"
        height={490}
      >
        <Body progress={myProgressLong} />
      </ProgressFrame>
      <ProgressFrame
        title="6 · The first day: one lesson, one course; a depth with nothing in it has no row"
        height={720}
      >
        <Body progress={myProgressFirstDay} />
      </ProgressFrame>
      <ProgressFrame
        title="7 · The check was taken and no lesson is learned yet: counted as marked as known, never as learned"
        height={720}
      >
        <Body progress={myProgressKnownOnly} />
      </ProgressFrame>
      <div className="grid items-start gap-6" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <ProgressFrame title="8 · History's first page on its way" height={470}>
          <UnderTheBoxes>
            <HistoryPending />
          </UnderTheBoxes>
        </ProgressFrame>
        <ProgressFrame title="9 · History's first page did not load" height={330}>
          <UnderTheBoxes>
            <HistoryFailed onReload={noop} />
          </UnderTheBoxes>
        </ProgressFrame>
        <ProgressFrame title="10 · Earlier days on their way" height={540}>
          <UnderTheBoxes>
            <HistoryList days={historyFirst.days.slice(3)} today={PROGRESS_TODAY} more="loading" onMore={noop} />
          </UnderTheBoxes>
        </ProgressFrame>
        <ProgressFrame title="11 · Earlier days that did not load: the days shown stay" height={540}>
          <UnderTheBoxes>
            <HistoryList days={historyFirst.days.slice(3)} today={PROGRESS_TODAY} more="failed" onMore={noop} />
          </UnderTheBoxes>
        </ProgressFrame>
        <ProgressFrame title="12 · Signed in, nothing learned and nothing marked: one way on" height={330}>
          <ProgressEmpty />
        </ProgressFrame>
        <ProgressFrame title="13 · Your progress on its way: the boxes keep their places" height={470}>
          <ProgressPending />
        </ProgressFrame>
        <ProgressFrame title="14 · Not signed in" height={330} bar={VISITOR_BAR}>
          <ProgressVisitor onSignIn={noop} />
        </ProgressFrame>
        <ProgressFrame title="15 · The session ended while the page was up" height={330} bar={VISITOR_BAR}>
          <ProgressVisitor ended onSignIn={noop} />
        </ProgressFrame>
        <ProgressFrame title="16 · Your progress did not load" height={330}>
          <ProgressFailed onReload={noop} />
        </ProgressFrame>
        <ProgressFrame title="17 · History before any day: lessons marked as known only" height={330}>
          <ViewHead view="history" line={null} />
          <HistoryList days={[]} today={PROGRESS_TODAY} more="end" onMore={noop} />
        </ProgressFrame>
      </div>
    </>
  );
}

/** My progress on a phone, for the phone board of all courses: the boxes one above the other, 17 weeks of days. */
export function MyProgressPhone() {
  return (
    <>
      <ProgressFrame title="My progress, Courses: the boxes one above the other, 17 weeks of days" height={1720} header>
        <Body />
      </ProgressFrame>
      <ProgressFrame title="My progress, History" height={1960} header>
        <Body view="history" shown={history()} />
      </ProgressFrame>
    </>
  );
}
