'use client';

import { Clock } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FairUseAppealForm, type FairUseAppealFormProps } from '@/components/workspace/fair-use-appeal';
import {
  EnterKey,
  IssueHints,
  LessonLine,
  MaskedIssueFacts,
  type MaskedIssueLesson,
} from '@/components/workspace/masked-issue/facts';
import { GivenBack, type GivenBackProps, NotForMe } from '@/components/workspace/masked-issue/give-back';
import { IssueStartForm, type IssueStartFormProps } from '@/components/workspace/masked-issue/issue-start-form';
import { useEnterKey } from '@/components/workspace/masked-issue/use-enter-key';
import { MaskedListFoot, WhyHiddenDialog } from '@/components/workspace/masked-issue/why-hidden';
import { RefChips } from '@/components/workspace/ref-chips';
import { beforePressLineOf, heldLineOf, limitEndOf, minutesLeftOf, starsTextOf } from '@/lib/workspace/masked-issue';
import type {
  FullIssue,
  IssueNumbers,
  IssuePage,
  IssuePageState,
  MaskedIssue,
} from '@/lib/workspace/masked-issue.types';

/** How often the hold's minutes are counted again. */
const TICK_MS = 10_000;

/** The clock, from `start`, moving while `running`. */
function useNow(start: Date, running: boolean): Date {
  const [now, setNow] = useState(start);
  useEffect(() => {
    if (!running) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

export type IssuePageScreenProps = {
  page: IssuePage;
  /** Where the person came from: Learn's words and form, or Contribute's. */
  from: 'learn' | 'contribute';
  /** "← Issues", to the list the issue is on. */
  back: { href: Route; label: string };
  /** The numbers of a night, for the window. */
  numbers: Pick<IssueNumbers, 'read' | 'kept'> | null;
  /** A visitor: the press needs a sign-in. */
  visitor?: boolean;
  /** The clock of the first render; the hold's minutes count down from it. */
  now: Date;
  /** The zone the hold's end is written in; the browser's unless given. */
  timeZone?: string;
  /** The lesson the issue uses or teaches, when there is one. */
  lesson?: MaskedIssueLesson | null;
  colors?: Readonly<Record<string, string>>;
  /** The press is on its way: the button waits in its place. */
  pressing?: boolean;
  /** "See the full issue", and "See the full issue again". */
  onSee?: () => void;
  /** "Start fixing it": the agents and what its buttons do. */
  start: Omit<IssueStartFormProps, 'from' | 'issueUrl'>;
  /** "Give it back". */
  onGiveBack?: () => void;
  givingBack?: boolean;
  /** After giving back: what the reasons and the note do. */
  givenBack?: Omit<GivenBackProps, 'backHref' | 'reasons' | 'note'>;
  /** Access to real issues is closed: the closing's words and the request to look again, in place of the page. */
  suspended?: FairUseAppealFormProps | null;
};

const CARD = 'flex flex-col gap-3 rounded-xl border bg-card p-5';
const LINK = 'self-start text-sm font-semibold text-link hover:underline';
const THREAD_LINK = 'self-start text-sm font-medium text-link hover:underline';

/** The issue as the page shows it before the press: its facts, its rewritten title, its lesson and hints. */
function MaskedCard({
  masked,
  lesson,
  colors,
}: {
  masked: MaskedIssue;
  lesson: MaskedIssueLesson | null;
  colors?: Readonly<Record<string, string>>;
}) {
  return (
    <section className={CARD} data-issue-card="masked">
      {masked.project ? <span className="font-mono text-sm text-muted-foreground">{masked.project}</span> : null}
      <MaskedIssueFacts issue={masked} colors={colors} />
      <h1 className="m-0 text-2xl font-bold tracking-tight text-balance">{masked.title}</h1>
      {lesson ? <LessonLine lesson={lesson} /> : null}
      <IssueHints hints={masked.hints} />
    </section>
  );
}

/**
 * The issue in full, for the person who holds it: the project, the issue's chip and the stars, then the same line of
 * facts in its place, the real title, the link to the whole thread on GitHub, and the hints.
 */
function FullCard({
  masked,
  full,
  lesson,
  colors,
}: {
  masked: MaskedIssue | null;
  full: FullIssue;
  lesson: MaskedIssueLesson | null;
  colors?: Readonly<Record<string, string>>;
}) {
  const stars = starsTextOf(full.stars);
  const extra = full.agreementToSign === false ? ['No agreement to sign'] : [];
  return (
    <section className={CARD} data-issue-card="full">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <RefChips repo={full.repo} issue={full.number} />
        {stars ? <span>{stars}</span> : null}
      </div>
      {masked ? <MaskedIssueFacts issue={masked} colors={colors} /> : null}
      <h1 className="m-0 text-2xl font-bold tracking-tight text-balance">{full.title}</h1>
      {lesson ? <LessonLine lesson={lesson} /> : null}
      <a href={full.url} target="_blank" rel="noopener noreferrer" className={THREAD_LINK}>
        Read the whole thread on GitHub ↗<span className="sr-only"> (opens GitHub)</span>
      </a>
      <IssueHints hints={masked?.hints ?? []} extra={extra} />
      {full.agreementToSign ? (
        <p className="m-0 text-xs text-muted-foreground">The project asks you to sign an agreement before it merges.</p>
      ) : null}
    </section>
  );
}

/** One end of a look: one sentence that says what happened, and one way on. */
function End({ state, title, text, children }: { state: string; title: string; text: string; children: ReactNode }) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border bg-card p-5" data-end={state}>
      <h1 className="m-0 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="m-0 max-w-[70ch] text-sm text-muted-foreground">{text}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

const PRIMARY = 'h-10 px-6 font-semibold max-sm:min-h-11';

/** The end's words and its way on, for the ends that are one sentence. */
function endOf(
  state: Exclude<IssuePageState, 'MASKED' | 'FULL' | 'GIVEN_BACK'>,
  props: IssuePageScreenProps,
): ReactNode {
  const back = (primary: boolean) => (
    <Button asChild variant={primary ? 'default' : 'ghost'} className={primary ? PRIMARY : 'h-9 px-3'}>
      <Link href={props.back.href} prefetch={false} data-primary-action={primary ? '' : undefined}>
        Back to Issues
      </Link>
    </Button>
  );
  const again = (
    <Button type="button" className={PRIMARY} onClick={props.onSee} data-primary-action="">
      See the full issue again
    </Button>
  );
  switch (state) {
    case 'EXPIRED':
      return (
        <End
          state={state}
          title="The 15 minutes are over"
          text="The issue went back to the list, so someone else may take it. If it is still free you can see it again. That counts as one more of today's issues."
        >
          {again}
          {back(false)}
        </End>
      );
    case 'REPLACED':
      return (
        <End
          state={state}
          title="You gave this issue back when you saw another"
          text="You hold one issue at a time. If this one is still free you can see it again. That counts as one more of today's issues."
        >
          {again}
          {back(false)}
        </End>
      );
    case 'TAKEN':
      return (
        <End
          state={state}
          title="Someone else is looking at this issue"
          text="They hold it for up to 15 minutes. If they give it back, it returns to your list."
        >
          {back(true)}
        </End>
      );
    case 'LIMIT': {
      const words = props.page.looks
        ? limitEndOf(props.page.looks)
        : { title: 'You have seen your full issues for today', text: 'You can see more after 00:00 UTC.' };
      return (
        <End state={state} title={words.title} text={words.text}>
          {back(true)}
          <WhyHiddenDialog numbers={props.numbers} />
        </End>
      );
    }
    case 'LEFT_POOL':
      return (
        <End
          state={state}
          title="This issue is no longer open for a fix"
          text="It was closed or taken on GitHub. It did not count against today's issues."
        >
          {back(true)}
        </End>
      );
    case 'NOT_AVAILABLE':
      return (
        <End
          state={state}
          title="This issue is not on your list"
          text="You gave it back or skipped it before, or the project is not open to you right now. Your list has others."
        >
          {back(true)}
        </End>
      );
    case 'STARTED':
      return (
        <End
          state={state}
          title="You started this issue"
          text="Your agent is on it. Its page shows each step as it goes."
        >
          {props.page.startPath ? (
            <Button asChild className={PRIMARY}>
              <Link href={props.page.startPath as Route} prefetch={false} data-primary-action="">
                Go to its page
              </Link>
            </Button>
          ) : null}
          {back(!props.page.startPath)}
        </End>
      );
  }
}

/** Presses the page's main link or button, for Enter. */
const pressPrimary = () => document.querySelector<HTMLElement>('[data-primary-action]')?.click();

/**
 * The page of one issue, at an address that names no project, in each of its states. Before the press: the masked
 * card, "See the full issue" with Enter, what the press does, then the link to the window and the day's count. After
 * the press: a strip with the hold's end and its minutes, the issue in full, then "Start fixing it" and, under it,
 * "Not for me"; once the 15 minutes run out the page says so in place. After "Give it back": the reasons and the
 * note. The other ends are one sentence and one way on. A closed access shows its words and the request to look again.
 */
export function IssuePageScreen(props: IssuePageScreenProps) {
  const { page, from, back, numbers, visitor = false, timeZone, lesson = null, colors, pressing = false } = props;
  const held = page.state === 'FULL' && !!page.until;
  const now = useNow(props.now, held);
  const over = held && page.until !== null && minutesLeftOf(page.until, now) === 0;
  const state: IssuePageState = over ? 'EXPIRED' : page.state;
  const masked = page.masked;

  const enter =
    props.suspended || state === 'FULL'
      ? null
      : state === 'MASKED'
        ? pressing || !props.onSee
          ? null
          : props.onSee
        : pressPrimary;
  useEnterKey(enter);

  let body: ReactNode;
  if (props.suspended) {
    body = <FairUseAppealForm {...props.suspended} />;
  } else if (state === 'MASKED' && masked) {
    body = (
      <>
        <MaskedCard masked={masked} lesson={lesson} colors={colors} />
        <div className="flex flex-col items-start gap-2.5">
          <Button
            type="button"
            className={`${PRIMARY} aria-disabled:opacity-60`}
            onClick={pressing ? undefined : props.onSee}
            aria-disabled={pressing || undefined}
            data-see-full=""
          >
            {pressing ? 'Opening…' : 'See the full issue'}
            {pressing ? null : <EnterKey />}
          </Button>
          <span className="text-sm text-muted-foreground" data-press-line="">
            {beforePressLineOf(page.holding, now)}
          </span>
        </div>
        <MaskedListFoot looks={visitor ? null : page.looks} numbers={numbers} className="border-t pt-4" />
      </>
    );
  } else if (state === 'FULL' && page.full) {
    body = (
      <>
        <div
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg border bg-muted/50 px-4 py-2.5 text-sm"
          data-held=""
        >
          <span className="inline-flex items-center gap-2 font-medium" role="timer" aria-live="off">
            <Clock aria-hidden="true" className="size-3.5" />
            {page.until ? heldLineOf(page.until, now, timeZone) : 'Held for you'}
          </span>
          <span className="text-muted-foreground">Nobody else sees this issue while you hold it.</span>
        </div>
        <FullCard masked={masked} full={page.full} lesson={lesson} colors={colors} />
        <IssueStartForm from={from} issueUrl={page.full.url} {...props.start} />
        <NotForMe onGiveBack={props.onGiveBack} sending={props.givingBack} />
      </>
    );
  } else if (state === 'GIVEN_BACK') {
    body = <GivenBack backHref={back.href} reasons={page.reasons} note={page.note} {...props.givenBack} />;
  } else if (state === 'MASKED' || state === 'FULL') {
    // A page with nothing to show of its issue: it is no longer open to the viewer.
    body = endOf('NOT_AVAILABLE', props);
  } else {
    body = endOf(state, props);
  }

  return (
    <div className="flex flex-col gap-5" data-issue-page={state}>
      <Link href={back.href} prefetch={false} className={LINK}>
        ← {back.label}
      </Link>
      {body}
    </div>
  );
}
