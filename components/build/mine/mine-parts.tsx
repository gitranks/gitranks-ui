'use client';

import { Check, Star } from 'lucide-react';
import Link from 'next/link';
import { type KeyboardEvent, type ReactNode, type Ref, useEffect, useRef, useState } from 'react';

import { ShareButton } from '@/components/share/share-button';
import { Button } from '@/components/ui/button';
import { placeWordsOf } from '@/lib/build/home';
import {
  CONTINUE_SENTENCE,
  isEmptyMine,
  type MineBuiltRow,
  type MineProgressRow,
  type MineSquare,
  type MineTestRow,
  type MineView,
  mineProjectHref,
  removeQuestionOf,
} from '@/lib/build/mine';
import { BUILD_PROJECTS_PATH, buildSkillsPath } from '@/lib/build/paths';
import { cn } from '@/lib/utils';

/*
 * My builds, as the approved designs draw it: one reading column of three lists, each shown only when it has
 * something. A row's text is on the left and its buttons on the right; on a phone the buttons drop under the text.
 */

/** The page's column: Build's reading width. */
export const MINE_MAIN_CLASS = 'mx-auto flex w-full max-w-[860px] flex-col gap-8 px-4 pt-6 pb-16 sm:gap-10 sm:pt-8';

/** What removing a build came to: gone, not done (the row says so), or the list must be read again. */
export type RemoveOutcome = 'removed' | 'failed' | 'reload';

const LIST_CLASS = 'm-0 list-none divide-y overflow-hidden rounded-lg border bg-card p-0';
const ROW_CLASS = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-3 p-4';
const TEXT_CLASS = 'flex min-w-0 flex-[1_1_260px] flex-col gap-1.5';
const ACTIONS_CLASS = 'flex flex-none flex-wrap items-center gap-3';
const TITLE_CLASS = 'inline-flex items-center gap-1.5 text-base font-semibold hover:underline';
const QUIET_CLASS = 'text-xs text-muted-foreground hover:text-foreground hover:underline max-sm:min-h-11';
const BUTTON_CLASS = 'font-semibold max-sm:min-h-11';

/** The page's title and its line, in every state. */
export function MineHead({ titleRef }: { titleRef?: Ref<HTMLHeadingElement> }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 ref={titleRef} tabIndex={-1} className="m-0 text-3xl font-bold tracking-tight outline-none">
        My builds
      </h1>
      <p className="m-0 text-base leading-relaxed">
        Every project you started, with where it stands. Only you see this page.
      </p>
    </div>
  );
}

/** A list's heading, with an optional line under it. */
function Section({ id, title, line, children }: { id: string; title: string; line?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby={id} data-build-mine-section={id}>
      <div className="flex flex-col gap-1">
        <h2 id={id} tabIndex={-1} className="m-0 text-xl font-bold tracking-tight outline-none">
          {title}
        </h2>
        {line ? <p className="m-0 text-sm text-muted-foreground max-sm:hidden">{line}</p> : null}
      </div>
      {children}
    </section>
  );
}

/** The parts of a row's line, with a dot between them that a screen reader skips. */
function Meta({ parts }: { parts: string[] }) {
  return (
    <span className="text-sm text-muted-foreground">
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}

const SQUARE_CLASS: Record<MineSquare, string> = {
  done: 'bg-brand-soft-foreground',
  current: 'bg-brand-soft shadow-[inset_0_0_0_2px_var(--brand-soft-foreground)]',
  to_come: 'bg-muted shadow-[inset_0_0_0_1px_var(--border)]',
};

/** One square a step: passed, the one to do, the ones to come. The line beside it says the same in words. */
function Squares({ squares }: { squares: MineSquare[] }) {
  return (
    <span className="pt-0.5">
      <span className="flex flex-wrap items-center gap-[5px]" aria-hidden="true" data-build-squares>
        {squares.map((square, index) => (
          <span key={index} data-square={square} className={cn('block size-3.5 rounded-[3px]', SQUARE_CLASS[square])} />
        ))}
      </span>
    </span>
  );
}

/** A test that waits: the only rows with a main button. */
function TestRow({ row }: { row: MineTestRow }) {
  return (
    <li data-build-mine-row="test" data-build={row.build}>
      <div className={ROW_CLASS}>
        <div className={TEXT_CLASS}>
          <Link href={mineProjectHref(row.project)} className={TITLE_CLASS}>
            {row.project.name}
          </Link>
          <span className="text-sm text-muted-foreground">{row.text}</span>
        </div>
        <div className={ACTIONS_CLASS}>
          <Button asChild className={BUTTON_CLASS}>
            <Link href={row.href}>{row.action}</Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** What a row of a build in progress is doing: shown, asking whether to remove it, removing, or refused. */
export type RemoveStep = 'asking' | 'removing' | 'failed';

/**
 * A build in progress: the project, the language, the step, when the last step was, the squares; "Remove" and "Open".
 * "Remove" asks in the row's own place, and "Keep it" puts the row back as it was. A built project's optional part in
 * progress has no "Remove": a built project is kept.
 */
function ProgressRow({
  row,
  remove,
  onAsk,
  onKeep,
  onConfirm,
}: {
  row: MineProgressRow;
  remove: RemoveStep | null;
  onAsk: () => void;
  onKeep: () => void;
  onConfirm: () => void;
}) {
  const keep = useRef<HTMLButtonElement>(null);
  const ask = useRef<HTMLButtonElement>(null);
  const asked = useRef(false);
  useEffect(() => {
    // The question takes the focus on its safe answer, and again when removing failed; "Keep it" gives it back to
    // "Remove".
    if ((remove === 'asking' && !asked.current) || remove === 'failed') keep.current?.focus();
    if (remove === null && asked.current) ask.current?.focus();
    asked.current = remove !== null;
  }, [remove]);

  const name = (
    <Link href={mineProjectHref(row.project)} className={TITLE_CLASS}>
      {row.project.name}
    </Link>
  );
  if (remove) {
    // Escape answers the question as "Keep it".
    const keepOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && remove !== 'removing') onKeep();
    };
    return (
      <li data-build-mine-row="progress" data-build={row.build} data-remove={remove}>
        <div className={cn(ROW_CLASS, 'bg-destructive/6')}>
          <div className={TEXT_CLASS}>
            {name}
            <span className="text-sm" role={remove === 'failed' ? 'alert' : undefined}>
              {remove === 'failed' ? 'The build was not removed. Try again in a minute.' : removeQuestionOf(row.passed)}
            </span>
          </div>
          <div className={ACTIONS_CLASS}>
            <Button
              type="button"
              variant="destructive"
              className={BUTTON_CLASS}
              disabled={remove === 'removing'}
              aria-busy={remove === 'removing'}
              onClick={onConfirm}
              onKeyDown={keepOnEscape}
            >
              Remove the build
            </Button>
            <Button
              ref={keep}
              type="button"
              variant="outline"
              className={BUTTON_CLASS}
              disabled={remove === 'removing'}
              onClick={onKeep}
              onKeyDown={keepOnEscape}
            >
              Keep it
            </Button>
          </div>
        </div>
      </li>
    );
  }
  return (
    <li data-build-mine-row="progress" data-build={row.build}>
      <div className={ROW_CLASS}>
        <div className={TEXT_CLASS}>
          {name}
          <Meta
            parts={[
              row.language,
              placeWordsOf({ step: { number: row.step }, of: row.of, part: row.part }),
              ...(row.lastStep ? [`${row.started ? 'started' : 'last step'} ${row.lastStep}`] : []),
            ]}
          />
          <Squares squares={row.squares} />
        </div>
        <div className={ACTIONS_CLASS}>
          {row.part ? null : (
            <button ref={ask} type="button" className={QUIET_CLASS} onClick={onAsk}>
              Remove<span className="sr-only">: {`${row.project.name}, ${row.language}`}</span>
            </button>
          )}
          <Button asChild variant="outline" className={BUTTON_CLASS}>
            <Link href={mineProjectHref(row.project)}>
              Open<span className="sr-only">: {row.project.name}</span>
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}

/** How long the copy button reads "Copied". */
const COPIED_MS = 1500;

/** The one sentence to say in the agent, with Copy: a build moves in the agent, so this is its button. */
function SayLine() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CONTINUE_SENTENCE);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex flex-col gap-1.5" data-build-say>
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
        <code className="min-w-0 truncate font-mono text-[13px]">{CONTINUE_SENTENCE}</code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center justify-center rounded-md border bg-background px-2 py-0.5 text-xs font-medium shadow-xs hover:bg-accent max-sm:min-h-11 max-sm:px-3"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? 'Copied' : ''}
        </span>
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        Say this in your agent, in the folder of a build, to go on with it. In any chat, on any machine.
      </p>
    </div>
  );
}

const PILL_CLASS = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold';

/** The marks of a built project, gold first. */
function Marks({ row }: { row: MineBuiltRow }) {
  if (!row.repeated && !row.answeredEveryStep) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pt-0.5" data-build-marks>
      {row.repeated ? (
        <span
          data-mark="repeated"
          className={cn(
            PILL_CLASS,
            'bg-warning-soft text-warning-soft-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--warning)_35%,transparent)]',
          )}
        >
          <Star aria-hidden="true" className="size-3.5 fill-current text-warning" />
          Repeated after a week
        </span>
      ) : null}
      {row.answeredEveryStep ? (
        <span data-mark="answered" className={cn(PILL_CLASS, 'bg-brand-soft text-brand-soft-foreground')}>
          <Check aria-hidden="true" className="size-4" />
          Answered every step
        </span>
      ) : null}
    </div>
  );
}

/** A built project: when, the score, the parts, the marks and the gold test; "Your answers" and Share. */
function BuiltRow({ row }: { row: MineBuiltRow }) {
  const href = mineProjectHref(row.project);
  return (
    <li data-build-mine-row="built" data-build={row.build}>
      <div className={ROW_CLASS}>
        <div className={TEXT_CLASS}>
          <Link href={href} className={TITLE_CLASS}>
            <Check aria-hidden="true" className="size-4 text-positive" />
            {row.project.name}
          </Link>
          <Meta parts={row.meta} />
          <Marks row={row} />
          {row.gold ? (
            <span className="text-sm text-muted-foreground" data-build-gold>
              {row.gold}
            </span>
          ) : null}
        </div>
        <div className={ACTIONS_CLASS}>
          <Link href={row.answersHref} className={cn(QUIET_CLASS, 'inline-flex items-center')}>
            Your answers<span className="sr-only">: {`${row.project.name}, ${row.meta[0] ?? ''}`}</span>
          </Link>
          <ShareButton href={href} title={row.project.name} className={BUTTON_CLASS} />
        </div>
      </div>
    </li>
  );
}

const MINE_EMPTY_ID = 'build-mine-empty';
/** Where the focus goes once a build is removed and its row is gone: the first of these still on the page. */
const AFTER_REMOVE_IDS = ['build-mine-progress', 'build-mine-waiting', 'build-mine-built', MINE_EMPTY_ID];

/** Nothing started, and the address opened by hand: one way on, to the projects. */
export function MineEmpty() {
  return (
    <div className="flex flex-col gap-3" data-build-mine="empty">
      <h2 id={MINE_EMPTY_ID} tabIndex={-1} className="m-0 text-xl font-bold tracking-tight outline-none">
        You have no builds yet
      </h2>
      <p className="m-0 text-sm text-muted-foreground">
        Pick a project and say one sentence in your agent. Your build shows here from its first step.
      </p>
      <div>
        <Button asChild className={BUTTON_CLASS}>
          <Link href={BUILD_PROJECTS_PATH}>See the projects</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * The page once the person's builds are in. `asking` opens a row's question from the start (the boards draw it);
 * `onRemove` removes a build and says what came of it.
 */
export function MineBody({
  view,
  login,
  asking = null,
  onRemove,
}: {
  view: MineView;
  /** The person's login, for their Skills page; null leaves the words without the link. */
  login: string | null;
  asking?: string | null;
  onRemove: (build: string) => Promise<RemoveOutcome>;
}) {
  const [remove, setRemove] = useState<{ build: string; step: RemoveStep } | null>(
    asking ? { build: asking, step: 'asking' } : null,
  );
  // What the last removal came to, counted so each one is told and moves the focus.
  const [after, setAfter] = useState<{ outcome: 'removed' | 'reload'; build: string; count: number } | null>(null);
  useEffect(() => {
    if (!after) return;
    // A refused removal: the build is drawn as it is now, maybe in another list; its name takes the focus.
    if (after.outcome === 'reload') {
      const row = [...document.querySelectorAll<HTMLElement>('[data-build-mine-row]')].find(
        (each) => each.dataset.build === after.build,
      );
      const name = row?.querySelector<HTMLElement>('a');
      if (name) {
        name.focus();
        return;
      }
    }
    // The removed row took the focus with it: the list it was in takes it, or what the page shows now.
    for (const id of AFTER_REMOVE_IDS) {
      const heading = document.getElementById(id);
      if (heading) {
        heading.focus();
        return;
      }
    }
  }, [after]);

  // The same words twice in a row are read out again: every other one ends in a space a screen reader skips.
  const removedWords = after?.outcome === 'removed' ? `The build was removed.${after.count % 2 ? '' : '\u00a0'}` : '';
  const status = (
    <span role="status" aria-live="polite" className="sr-only" data-build-mine-status>
      {removedWords}
    </span>
  );
  if (isEmptyMine(view)) {
    return (
      <>
        <MineEmpty />
        {status}
      </>
    );
  }

  const confirm = async (build: string) => {
    setRemove({ build, step: 'removing' });
    setAfter(null);
    const outcome = await onRemove(build);
    setRemove((current) =>
      current?.build !== build ? current : outcome === 'failed' ? { build, step: 'failed' } : null,
    );
    if (outcome !== 'failed') setAfter((last) => ({ outcome, build, count: (last?.count ?? 0) + 1 }));
  };

  return (
    <div className="contents" data-build-mine="ready">
      {after?.outcome === 'reload' ? (
        <p role="status" className="m-0 text-sm" data-build-mine-notice>
          That build changed since this page was read, so it was not removed. It is shown here as it is now.
        </p>
      ) : null}
      {view.tests.length ? (
        <Section
          id="build-mine-waiting"
          title="Waiting for you"
          line="A test is the only thing that waits. Everything else moves when you say so in your agent."
        >
          <ul className={LIST_CLASS}>
            {view.tests.map((row) => (
              <TestRow key={`${row.build}:${row.kind}`} row={row} />
            ))}
          </ul>
        </Section>
      ) : null}
      {view.inProgress.length ? (
        <Section id="build-mine-progress" title="In progress">
          <ul className={LIST_CLASS}>
            {view.inProgress.map((row) => (
              <ProgressRow
                key={row.build}
                row={row}
                remove={remove?.build === row.build ? remove.step : null}
                onAsk={() =>
                  // One question at a time: a build being removed keeps its row until the answer comes.
                  setRemove((current) =>
                    current?.step === 'removing' ? current : { build: row.build, step: 'asking' },
                  )
                }
                onKeep={() => setRemove(null)}
                onConfirm={() => void confirm(row.build)}
              />
            ))}
          </ul>
          <SayLine />
        </Section>
      ) : null}
      {view.built.length ? (
        <Section id="build-mine-built" title="Built">
          <ul className={LIST_CLASS}>
            {view.built.map((row) => (
              <BuiltRow key={row.build} row={row} />
            ))}
          </ul>
        </Section>
      ) : null}
      {!view.tests.length && !view.inProgress.length ? (
        <p className="m-0 text-sm" data-build-mine-next>
          Nothing is in progress.{' '}
          <Link href={BUILD_PROJECTS_PATH} className="font-medium text-link hover:underline">
            Pick your next project
          </Link>
        </p>
      ) : null}
      <p className="m-0 text-xs text-muted-foreground" data-build-mine-skills>
        Built projects also show on{' '}
        {login ? (
          <Link href={buildSkillsPath(login)} className="font-medium text-link hover:underline">
            your Skills page
          </Link>
        ) : (
          'your Skills page'
        )}
        , for everyone. Builds in progress show only here.
      </p>
      {status}
    </div>
  );
}

/** A message in the page's place (signed out, a session that ended, a read that failed), with its one button. */
export function MineMessage({
  state,
  title,
  text,
  titleRef,
  children,
}: {
  state: 'visitor' | 'ended' | 'failed';
  title: string;
  text: string;
  titleRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3" data-build-mine={state}>
      <h2 ref={titleRef} tabIndex={-1} className="m-0 text-xl font-bold tracking-tight outline-none">
        {title}
      </h2>
      <p className="m-0 text-sm text-muted-foreground">{text}</p>
      <div>{children}</div>
    </div>
  );
}

/** The lists' place while the person's builds are on their way. */
export function MinePending() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" data-build-mine="pending">
      <span className="sr-only" role="status">
        Loading your builds…
      </span>
      <div className="h-7 w-40 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="h-28 rounded-lg border bg-card" />
    </div>
  );
}
