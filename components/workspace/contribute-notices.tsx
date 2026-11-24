import { TriangleAlert } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { FairUseMessage } from './fair-use-message';
import { CONTACT_EMAIL } from '@/lib/legal';
import { cn } from '@/lib/utils';
import type { ContributeNotice } from '@/lib/workspace/contribute-state';
import { ASK_AGAIN, CONTRIBUTE_RULES_PATH, fairUseAnswerPathOf, isAccessClosed } from '@/lib/workspace/fair-use';
import { dayLabel } from '@/lib/workspace/format';
import { KEY_REPLACE_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';

type NoticeCopy = {
  title: string;
  text: ReactNode;
  action?: { href: Route; label: string };
  /** A plain link beside the action: the rule a fair-use block points to. */
  more?: { href: Route; label: string };
  tone: 'info' | 'warn';
};

const untilText = (until: string | null, fallback: string) => (until ? `on ${dayLabel(until)}` : fallback);

/** What each notice says, and where it sends the user. */
export function noticeCopyOf(notice: ContributeNotice): NoticeCopy {
  switch (notice.kind) {
    case 'no-key':
      return {
        tone: 'info',
        title: 'Connect your Claude key to start',
        text: 'Nothing runs until there is a key. It takes about two minutes in the Claude Console.',
        action: { href: WORKSPACE_PATHS.agentKey, label: 'Connect Claude' },
      };
    case 'key-invalid':
      return {
        tone: 'warn',
        title: 'Your Claude key stopped working',
        text: 'Anthropic refused it: it was deleted, or it is not the key you meant. Contributing is paused until you connect a working one.',
        action: { href: KEY_REPLACE_PATH, label: 'Connect a new key' },
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
    case 'suspended':
      if (notice.fairUse) return fairUseBlockCopyOf(notice.fairUse.block);
      return {
        tone: 'warn',
        title: 'Contribute is paused for this account',
        text: (
          <>
            Activity on this account looks automated, so it can&apos;t see or take issues for now. If we got this wrong,
            write to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-link hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            and we&apos;ll look at it.
          </>
        ),
      };
  }
}

/**
 * A fair-use rule blocked the account: still paused, but the block's message, its answer page and the rule in the Terms
 * in place of the automated-activity words; the rule alone when the message could not be read. A closed access (a rule
 * of today) says so, and its answer page is where to ask us to look again.
 */
function fairUseBlockCopyOf(block: NonNullable<Extract<ContributeNotice, { kind: 'suspended' }>['fairUse']>['block']) {
  const copy: NoticeCopy = { tone: 'warn', title: 'Contribute is paused for this account', text: null };
  if (!block) {
    return {
      ...copy,
      text: (
        <>
          Read the rule in our{' '}
          <Link href={CONTRIBUTE_RULES_PATH} prefetch={false} className="text-link hover:underline">
            Terms of service
          </Link>
          .
        </>
      ),
    };
  }
  const closed = isAccessClosed(block);
  return {
    ...copy,
    ...(closed ? { title: 'Your access to real issues is closed' } : {}),
    text: <FairUseMessage notice={block} />,
    action: { href: fairUseAnswerPathOf(block.id), label: closed ? ASK_AGAIN : 'Answer' },
    more: { href: CONTRIBUTE_RULES_PATH, label: 'Terms of service' },
  };
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

const ActionLink = ({ action }: { action: NonNullable<NoticeCopy['action']> }) => (
  <Link href={action.href} prefetch={false} className="text-sm font-semibold text-link">
    {action.label} →
  </Link>
);

/** The notice's action, with its plain link beside it when it has one. */
const Actions = ({ copy }: { copy: NoticeCopy }) =>
  copy.more ? (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {copy.action ? <ActionLink action={copy.action} /> : null}
      <Link href={copy.more.href} prefetch={false} className="text-sm text-link hover:underline">
        {copy.more.label}
      </Link>
    </span>
  ) : copy.action ? (
    <ActionLink action={copy.action} />
  ) : null;

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
              why={
                <>
                  {copy.text}
                  {copy.action || copy.more ? (
                    <span className="mt-1.5 block">
                      <Actions copy={copy} />
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
            <Actions copy={copy} />
          </div>
        );
      })}
    </div>
  );
}
