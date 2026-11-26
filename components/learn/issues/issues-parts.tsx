'use client';

import { ArrowLeft, X } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react';

import { EmailNeedsAddress } from '@/components/learn/email-needs-address';
import { Button } from '@/components/ui/button';
import { ManagedSignOut } from '@/components/workspace/managed-sign-out';
import { RefChips } from '@/components/workspace/ref-chips';
import { MANAGED_ACCOUNT_TITLE, managedAccountText } from '@/components/workspace/setting-up';
import { LEARN_FIXES_PAGE_BUILT } from '@/lib/learn/built-pages';
import {
  EMAIL_ME_LABEL,
  emailOnLineOf,
  FOR_YOU_CHANGE,
  FOR_YOU_LINE,
  type IssuesChip,
  type IssuesEmailState,
  type IssuesEnd,
  type IssuesSwitch,
  type LearnFixRow,
  mergedOnOf,
  switchCountLabelOf,
} from '@/lib/learn/issues';
import { LEARN_ABOUT_PATH, LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import { learnFixPath, learnLessonPath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';

/*
 * The parts of Issues, each from plain data: the row above the list (the way back, the chips, the switches),
 * an empty end with its one press, "Email me when one appears", the merged fixes and the foot.
 */

const PILL = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap';
/** A 44px tall target on a phone, the drawn pill unchanged. */
const PHONE_TARGET = "relative after:absolute after:inset-x-0 after:-inset-y-[7px] after:content-[''] sm:after:hidden";

/** "← Find duplicates in one pass with a set": back to the lesson or the course that opened the page. */
export function IssuesBack({ back }: { back: { label: string; href: Route } }) {
  return (
    <Link
      href={back.href}
      prefetch={false}
      className="inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline max-sm:min-h-11"
      data-issues-back=""
    >
      <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
      <span className="truncate">{back.label}</span>
    </Link>
  );
}

/** One chip set by the link that opened the page, with its cross. */
function Chip({ chip }: { chip: IssuesChip }) {
  return (
    <span
      className={cn(PILL, 'border-primary/40 bg-brand-soft pr-1.5 text-brand-soft-foreground')}
      data-issues-chip={chip.key}
    >
      {chip.label}
      <Link
        href={chip.removeHref}
        prefetch={false}
        scroll={false}
        aria-label={`Remove ${chip.label}`}
        className={cn('inline-flex size-4 items-center justify-center rounded-full hover:bg-primary/15', PHONE_TARGET)}
      >
        <X aria-hidden="true" className="size-3" />
      </Link>
    </span>
  );
}

/** A switch is pressed with Space as well as Enter: Space on a link does nothing of itself, so it clicks it. */
const pressOnSpace = (event: KeyboardEvent<HTMLAnchorElement>) => {
  if (event.key !== ' ' && event.key !== 'Spacebar') return;
  event.preventDefault();
  event.currentTarget.click();
};

/** "Lessons I learned 14": one switch; only a switch that is off shows a count, the list it holds once pressed. */
function Switch({ item }: { item: IssuesSwitch }) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      scroll={false}
      role="switch"
      aria-checked={item.on}
      onKeyDown={pressOnSpace}
      className={cn(
        PILL,
        PHONE_TARGET,
        item.on ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-accent',
      )}
      data-issues-switch={item.key}
      data-on={item.on ? 'on' : 'off'}
    >
      {item.label}
      {item.count ? (
        <>
          <span aria-hidden="true" className="font-mono tabular-nums">
            {item.count}
          </span>
          <span className="sr-only">, {switchCountLabelOf(item.count)}</span>
        </>
      ) : null}
    </Link>
  );
}

/**
 * The row above the list: the chips with their crosses, then the two switches (a signed-in person's only), and
 * "Clear filters" while a chip is set. Under it, while "For you" is on, what it means and where to change it.
 */
export function IssuesFilters({
  chips,
  switches,
  clearHref,
}: {
  chips: readonly IssuesChip[];
  /** None for a visitor, and in the merged fixes, which the switches do not narrow. */
  switches: readonly IssuesSwitch[];
  clearHref: Route | null;
}) {
  const forYouOn = switches.some((item) => item.key === 'for-you' && item.on);
  if (!chips.length && !switches.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <fieldset className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2.5 border-0 p-0" aria-label="Filters">
        {chips.map((chip) => (
          <Chip key={chip.key} chip={chip} />
        ))}
        {switches.length ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            {switches.map((item) => (
              <Switch key={item.key} item={item} />
            ))}
          </span>
        ) : null}
        {clearHref && chips.length ? (
          <Link
            href={clearHref}
            prefetch={false}
            scroll={false}
            className="ml-1 text-xs font-medium text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
            data-issues-clear=""
          >
            Clear filters
          </Link>
        ) : null}
      </fieldset>
      {forYouOn ? (
        <p className="m-0 text-sm text-muted-foreground" data-for-you-line="">
          {FOR_YOU_LINE}{' '}
          <Link href={FOR_YOU_CHANGE.href} prefetch={false} className="font-medium text-link hover:underline">
            {FOR_YOU_CHANGE.label}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** A box in the list's place: an empty end, the unavailable state, a failure. Its buttons under its words. */
export function IssuesBox({
  title,
  text,
  children,
  kind,
}: {
  title: string;
  text: ReactNode;
  children?: ReactNode;
  kind: string;
}) {
  return (
    <section className="flex flex-col items-start gap-3 rounded-xl border bg-card p-6" data-issues-box={kind}>
      <h2 className="m-0 text-base font-semibold text-balance">{title}</h2>
      <div className="max-w-prose text-sm text-muted-foreground">{text}</div>
      {children ? <div className="flex flex-wrap items-center gap-3">{children}</div> : null}
    </section>
  );
}

/** No list for a company-managed GitHub account: why it can't be used, and Sign out to pick another. */
export function IssuesManagedBox() {
  return (
    <IssuesBox kind="managed" title={MANAGED_ACCOUNT_TITLE} text={managedAccountText('Learn')}>
      <ManagedSignOut />
    </IssuesBox>
  );
}

/** An empty end of a signed-in person's list: its words, "Turn off …" when issues wait behind it, and the email. */
export function IssuesEndBox({ end, email }: { end: IssuesEnd; email: ReactNode }) {
  return (
    <IssuesBox kind="end" title={end.title} text={end.text}>
      {end.turnOff ? (
        <Button asChild variant="outline" className="max-sm:min-h-11">
          <Link href={end.turnOff.href} prefetch={false} scroll={false} data-issues-turn-off="">
            {end.turnOff.label}
          </Link>
        </Button>
      ) : null}
      {end.email ? email : null}
    </IssuesBox>
  );
}

/**
 * "Email me when one appears", changed in place: the button; once on, a line in its place with the address and
 * "Turn off"; on with no address, a line that says the email needs one and where it is set. No pop-up, no question.
 * A press that changes it moves the focus to the button that takes the pressed one's place.
 */
export function IssuesEmail({
  state,
  pending = false,
  error = null,
  onTurnOn,
  onTurnOff,
}: {
  state: IssuesEmailState;
  pending?: boolean;
  error?: string | null;
  onTurnOn?: () => void;
  onTurnOff?: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  // The state a press was made from: once the state is another, the focus goes to the button now drawn.
  const pressedFrom = useRef<'off' | 'on' | null>(null);
  const shown = state.kind === 'off' ? 'off' : 'on';
  useEffect(() => {
    if (!pressedFrom.current || pressedFrom.current === shown) return;
    pressedFrom.current = null;
    button.current?.focus();
  }, [shown]);
  const press = (action: (() => void) | undefined) => () => {
    pressedFrom.current = shown;
    action?.();
  };
  const failed = error ? (
    <span role="alert" className="block text-sm font-medium text-destructive">
      {error}
    </span>
  ) : null;
  if (state.kind === 'off') {
    return (
      <span className="flex flex-col items-start gap-2" data-issues-email="off">
        <Button
          ref={button}
          type="button"
          variant="outline"
          className="max-sm:min-h-11"
          aria-disabled={pending || undefined}
          onClick={pending ? undefined : press(onTurnOn)}
        >
          {EMAIL_ME_LABEL}
        </Button>
        {failed}
      </span>
    );
  }
  return (
    <span className="flex flex-col items-start gap-2 text-sm" data-issues-email={state.kind}>
      {state.kind === 'on' ? <span className="text-foreground">{emailOnLineOf(state.to)}</span> : <EmailNeedsAddress />}
      <Button
        ref={button}
        type="button"
        variant="link"
        className="h-auto p-0 max-sm:min-h-11"
        aria-disabled={pending || undefined}
        onClick={pending ? undefined : press(onTurnOff)}
      >
        Turn off
      </Button>
      {failed}
    </span>
  );
}

/**
 * One merged fix: the project with its issue and pull request, who fixed it, the title, its lesson and the day. The
 * title is plain text: the fix's own page is not there yet, and a link never leads to a page that is not.
 */
export function FixRow({
  fix,
  lessonLine = true,
}: {
  fix: LearnFixRow;
  /** The line naming the lesson the fix used; left out under that lesson, where it would link to the page itself. */
  lessonLine?: boolean;
}) {
  const merged = mergedOnOf(fix.mergedAt);
  return (
    <article className="flex flex-col gap-3 px-4 py-3.5 sm:px-5" data-fix-row={`${fix.repo}#${fix.number}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <RefChips repo={fix.repo} issue={fix.issueNumber} pr={{ number: fix.number, url: fix.url }} />
          <span>fixed by {fix.fixer}</span>
        </div>
        {LEARN_FIXES_PAGE_BUILT ? (
          <Link
            href={learnFixPath({ nameWithOwner: fix.repo, number: fix.number })}
            prefetch={false}
            className="self-start font-semibold text-pretty text-foreground hover:underline"
            data-fix-title=""
          >
            {fix.title}
          </Link>
        ) : (
          <span className="font-semibold text-pretty text-foreground" data-fix-title="">
            {fix.title}
          </span>
        )}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {fix.lesson && lessonLine ? (
            <span data-lesson="">
              Used{' '}
              <Link
                href={learnLessonPath(fix.lesson.slug)}
                prefetch={false}
                className="font-medium text-foreground hover:underline"
              >
                {fix.lesson.title}
              </Link>
              .
            </span>
          ) : null}
          {merged ? <span className="text-xs">{merged}</span> : null}
        </span>
      </div>
    </article>
  );
}

/**
 * A merged fix as a card that opens its page, "Learn from it": the title, the lesson it used, the repository and the
 * issue, who fixed it and when it merged. `compact` under a lesson (no lesson line, which would name the page itself).
 * Before the page exists, the card is plain.
 */
export function FixCard({ fix, compact = false }: { fix: LearnFixRow; compact?: boolean }) {
  const merged = mergedOnOf(fix.mergedAt);
  const body = (
    <>
      <span className="font-semibold text-balance text-foreground">{fix.title}</span>
      {fix.lesson && !compact ? <span className="text-sm text-muted-foreground">Used: {fix.lesson.title}</span> : null}
      <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="min-w-0 truncate font-mono">
          {fix.repo} #{fix.issueNumber}
        </span>
        <span>fixed by {fix.fixer}</span>
        {merged ? (
          <span className="rounded-full bg-positive/10 px-2 py-0.5 font-medium text-positive">{merged}</span>
        ) : null}
      </span>
    </>
  );
  const box = cn('flex min-w-0 flex-1 flex-col rounded-xl border bg-card', compact ? 'gap-1.5 p-3' : 'gap-2 p-4');
  if (!LEARN_FIXES_PAGE_BUILT) {
    return (
      <div className={box} data-fix-card={`${fix.repo}#${fix.number}`}>
        {body}
      </div>
    );
  }
  return (
    <Link
      href={learnFixPath({ nameWithOwner: fix.repo, number: fix.number })}
      prefetch={false}
      className={cn(box, 'transition-colors hover:border-foreground/30')}
      data-fix-card={`${fix.repo}#${fix.number}`}
    >
      {body}
    </Link>
  );
}

/** Under every view: its Markdown copy, how Learn works, and the page for maintainers. */
export function IssuesFoot({ markdownHref }: { markdownHref: string }) {
  return (
    <p className="m-0 text-xs text-muted-foreground" data-issues-foot="">
      {/* A route handler's answer, not a page: a plain link. */}
      <a href={markdownHref} className="hover:underline">
        Markdown version
      </a>
      {' · '}
      <Link href={LEARN_ABOUT_PATH} prefetch={false} className="hover:underline">
        How Learn works
      </Link>
      {' · '}
      <Link href={LEARN_MAINTAINERS_PATH} prefetch={false} className="hover:underline">
        For maintainers
      </Link>
    </p>
  );
}
