import { TriangleAlert } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { ContributeNotice } from '@/lib/contribute/contribute-state';
import { dayLabel } from '@/lib/contribute/format';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';

type NoticeCopy = { title: string; text: ReactNode; action?: { href: Route; label: string }; tone: 'info' | 'warn' };

const untilText = (until: string | null, fallback: string) => (until ? `on ${dayLabel(until)}` : fallback);

/** A limit in running text: the number in mono, "1 issue", "3 new claims". */
function Count({ count, one, many = `${one}s` }: { count: number; one: string; many?: string }) {
  return (
    <>
      <span className="font-mono tabular-nums text-foreground">{count.toLocaleString('en-US')}</span>{' '}
      {count === 1 ? one : many}
    </>
  );
}

/** What each notice says, and where it sends the user. */
export function noticeCopyOf(notice: ContributeNotice): NoticeCopy {
  switch (notice.kind) {
    case 'no-key':
      return {
        tone: 'info',
        title: 'Connect your Claude key to start',
        text: 'Nothing runs until there is a key. It takes about two minutes in the Claude Console.',
        action: { href: '/contribute/connect', label: 'Connect Claude' },
      };
    case 'key-invalid':
      return {
        tone: 'warn',
        title: 'Your Claude key stopped working',
        text: 'Anthropic refused it: it was deleted, or it is not the key you meant. Contributing is paused until you connect a working one.',
        action: { href: '/contribute/connect', label: 'Connect a new key' },
      };
    case 'exhausted':
      return {
        tone: 'warn',
        title: 'Your credits are used up for this cycle',
        text: `Nothing starts until they renew ${untilText(notice.until, 'on your renewal day')}. Nothing is spent beyond them.`,
      };
    case 'limit-reached':
      return {
        tone: 'warn',
        title: "Your workspace's spend limit is reached",
        text: `The Claude Console stopped this workspace at its monthly limit. Work starts again ${untilText(notice.until, 'when the limit resets on the 1st')}, or raise the limit in the Console.`,
      };
    case 'paused':
      return {
        tone: 'info',
        title: 'Contributing is paused',
        text: 'No new attempts start until you resume. Your settings and queue are kept.',
        action: { href: '/contribute/settings', label: 'Resume in Settings' },
      };
    case 'new-account':
      return {
        tone: 'info',
        title: 'Smaller limits while your account is new',
        text: (
          <>
            Contribute starts new accounts on smaller limits:{' '}
            <Count count={notice.limits.attemptsAtATime} one="issue" /> at a time,{' '}
            <Count count={notice.limits.claimsPerDay} one="new claim" /> a day and{' '}
            <Count count={notice.limits.revealsPerDay} one="new issue" /> a day in this list. Every new account starts
            this way, to keep automated accounts from claiming issues meant for people; it isn&apos;t a judgement of
            you. The limits lift on their own as your account builds a track record.
          </>
        ),
      };
    case 'follow-through':
      return {
        tone: 'warn',
        title: 'Your limits are lower for now',
        text: (
          <>
            Most of your recent claims ran out without a pull request, and each one kept the issue from other
            contributors. For now Contribute holds you to <Count count={notice.limits.attemptsAtATime} one="issue" /> at
            a time and <Count count={notice.limits.claimsPerDay} one="new claim" /> a day. Release an issue you
            won&apos;t finish instead of letting it run out; the limits come back as your claims turn into pull
            requests.
          </>
        ),
      };
    case 'suspended':
      return {
        tone: 'warn',
        title: 'Contribute is paused for this account',
        text: (
          <>
            Activity on this account looks automated, so it can&apos;t see or claim issues for now. If we got this
            wrong, write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-link hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            and we&apos;ll look at it.
          </>
        ),
      };
  }
}

const TONES = {
  warn: 'border-warning/30 bg-warning-soft',
  info: 'border-primary/20 bg-brand-soft',
} as const;

/**
 * A notice in one line, its explanation one click away under "Why?": the account's access level on a contribution's
 * page, and the maintainer's stop in its header.
 */
export function NoticeLine({
  tone,
  icon,
  title,
  fact,
  why,
  role,
  data,
}: {
  tone: 'info' | 'warn';
  /** Draws `TriangleAlert` before the title. */
  icon: boolean;
  title: ReactNode;
  fact?: ReactNode;
  /** The body of "Why?". */
  why: ReactNode;
  /** `role="status"`: the account's notice only. */
  role?: 'status';
  /** Spread on the root: what marks the notice for the page and its specs. */
  data: Record<`data-${string}`, string>;
}) {
  return (
    <div role={role} {...data} className={cn('rounded-xl border px-4 py-2.5', TONES[tone])}>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-2 rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-h-0 [&::-webkit-details-marker]:hidden">
          {icon ? <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" /> : null}
          <span className="text-sm font-semibold">{title}</span>
          {fact ? <span className="text-sm text-muted-foreground">{fact}</span> : null}
          <span className="ml-auto text-sm font-medium text-link">Why?</span>
        </summary>
        <div className="mt-2 text-sm text-muted-foreground">{why}</div>
      </details>
    </div>
  );
}

/** The limits a reduced access level holds the account to, in a line: `1 issue at a time · 3 new claims a day`. */
function limitsFactOf(notice: ContributeNotice): ReactNode {
  if (notice.kind !== 'new-account' && notice.kind !== 'follow-through') return null;
  return (
    <>
      <Count count={notice.limits.attemptsAtATime} one="issue" /> at a time ·{' '}
      <Count count={notice.limits.claimsPerDay} one="new claim" /> a day
    </>
  );
}

const ActionLink = ({ action }: { action: NonNullable<NoticeCopy['action']> }) => (
  <Link href={action.href} prefetch={false} className="text-sm font-semibold text-link">
    {action.label} →
  </Link>
);

/**
 * The notices above a Contribute page; nothing when there are none. A box each (`box`), or a line each with its
 * explanation under "Why?" (`line`, on a contribution's page).
 */
export function ContributeNotices({
  notices,
  className,
  variant = 'box',
}: {
  notices: ContributeNotice[];
  className?: string;
  variant?: 'box' | 'line';
}) {
  if (!notices.length) return null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {notices.map((notice) => {
        const copy = noticeCopyOf(notice);
        if (variant === 'line') {
          return (
            <NoticeLine
              key={notice.kind}
              tone={copy.tone}
              icon={copy.tone === 'warn'}
              title={copy.title}
              fact={limitsFactOf(notice)}
              why={
                <>
                  {copy.text}
                  {copy.action ? (
                    <span className="mt-1.5 block">
                      <ActionLink action={copy.action} />
                    </span>
                  ) : null}
                </>
              }
              role="status"
              data={{ 'data-notice': notice.kind, 'data-notice-line': '' }}
            />
          );
        }
        return (
          <div
            key={notice.kind}
            role="status"
            data-notice={notice.kind}
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
              TONES[copy.tone],
            )}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{copy.title}</span>
              <span className="text-sm text-muted-foreground">{copy.text}</span>
            </div>
            {copy.action ? <ActionLink action={copy.action} /> : null}
          </div>
        );
      })}
    </div>
  );
}
