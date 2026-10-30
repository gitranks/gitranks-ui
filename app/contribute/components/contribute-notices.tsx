import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { ContributeNotice } from '@/lib/contribute/contribute-state';
import { dayLabel } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

type NoticeCopy = { title: string; text: ReactNode; action?: { href: Route; label: string }; tone: 'info' | 'warn' };

const untilText = (until: string | null, fallback: string) => (until ? `on ${dayLabel(until)}` : fallback);

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
  }
}

/** The notices above a Contribute page; nothing when there are none. */
export function ContributeNotices({ notices, className }: { notices: ContributeNotice[]; className?: string }) {
  if (!notices.length) return null;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {notices.map((notice) => {
        const copy = noticeCopyOf(notice);
        return (
          <div
            key={notice.kind}
            role="status"
            data-notice={notice.kind}
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
              copy.tone === 'warn' ? 'border-warning/30 bg-warning-soft' : 'border-primary/20 bg-brand-soft',
            )}
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-semibold">{copy.title}</span>
              <span className="text-sm text-muted-foreground">{copy.text}</span>
            </div>
            {copy.action ? (
              <Link href={copy.action.href} prefetch={false} className="text-sm font-semibold text-link">
                {copy.action.label} →
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
