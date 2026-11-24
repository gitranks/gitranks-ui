'use client';

import { X } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { FairUseMessage } from './fair-use-message';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ContributeFairUseNotice, ContributeFairUseNotices } from '@/lib/workspace/contribute.types';
import {
  ASK_AGAIN,
  CONTRIBUTE_RULES_PATH,
  fairUseAnswerPathOf,
  isAccessClosed,
  rulesBannerPartsOf,
} from '@/lib/workspace/fair-use';
import { dismissFairUseNotice, dismissRulesBanner } from '@/lib/workspace/fair-use.actions';

const LINK = 'font-semibold text-link hover:underline';
const TONES = {
  info: 'border-primary/30 bg-brand-soft text-foreground',
  warning: 'border-warning/40 bg-warning-soft text-warning-soft-foreground',
} as const;

/** The title every message from GitRanks about fair use carries. */
export const FAIR_USE_TITLE = 'A message from GitRanks';

/** One banner at the top of Contribute: a title, the words, what to do next, and a close button when it can close. */
function Banner({
  tone,
  name,
  title,
  children,
  actions,
  onClose,
}: {
  tone: keyof typeof TONES;
  name: string;
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  onClose?: () => void;
}) {
  return (
    <section
      aria-label="Message from GitRanks"
      data-fair-use-banner={tone}
      data-fair-use={name}
      className={cn(
        'relative flex flex-col gap-2 rounded-xl border px-5 py-4 text-sm',
        onClose && 'pr-14',
        TONES[tone],
      )}
    >
      <strong className="text-[15px] font-semibold">{title}</strong>
      <p className="leading-relaxed">{children}</p>
      {actions ? <div className="flex flex-wrap items-center gap-3 pt-1">{actions}</div> : null}
      {onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3"
        >
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </section>
  );
}

/**
 * "Answer", the message's answer page, then the rule in the Terms. A closed access asks "Ask us to look again" on the
 * same page instead, where its form is.
 */
function MessageActions({ notice }: { notice: ContributeFairUseNotice }) {
  return (
    <>
      <Button asChild className="max-sm:min-h-11">
        <Link href={fairUseAnswerPathOf(notice.id)} prefetch={false}>
          {isAccessClosed(notice) ? ASK_AGAIN : 'Answer'}
        </Link>
      </Button>
      <Link href={CONTRIBUTE_RULES_PATH} prefetch={false} className={`${LINK} text-sm`}>
        Terms of service
      </Link>
    </>
  );
}

/**
 * What the top of Contribute shows about fair use, as the API answers it; nothing when it answers none (or nothing at
 * all). The block's message (or the closed access), which cannot be closed; each open message, closed with its button
 * (it stays on its answer page); the Terms banner, for whoever the API says has not read the Terms of its date yet,
 * closed for good on every device.
 * A close hides the banner at once and is sent to the API; a close that fails shows it again.
 */
export function FairUseBanners({ fairUse }: { fairUse: ContributeFairUseNotices | null | undefined }) {
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  if (!fairUse) return null;

  const close = (key: string, send: () => Promise<{ ok: boolean }>) => {
    setClosed((was) => new Set(was).add(key));
    send()
      .then((result) => result.ok)
      .catch(() => false)
      .then((ok) => {
        if (ok) return;
        setClosed((was) => {
          const next = new Set(was);
          next.delete(key);
          return next;
        });
      });
  };

  const { block, rulesBanner } = fairUse;
  // The block's own message is the banner that cannot be closed, never a second one beside it.
  const open = fairUse.notices.filter(({ id }) => id !== block?.id && !closed.has(id));
  const banners: ReactNode[] = [];
  if (block) banners.push(<MessageBanner key={block.id} notice={block} name="block" />);
  for (const notice of open) {
    banners.push(
      <MessageBanner
        key={notice.id}
        notice={notice}
        name="notice"
        onClose={() => close(notice.id, () => dismissFairUseNotice(notice.id))}
      />,
    );
  }
  if (rulesBanner && !closed.has('rules')) {
    const { title, rest } = rulesBannerPartsOf(rulesBanner.text);
    banners.push(
      <Banner
        key="rules"
        tone="info"
        name="rules"
        title={title ?? FAIR_USE_TITLE}
        onClose={() => close('rules', dismissRulesBanner)}
      >
        {rest}{' '}
        <Link href={rulesBanner.path as Route} prefetch={false} className={LINK}>
          {rulesBanner.linkText}
        </Link>
      </Banner>,
    );
  }
  if (!banners.length) return null;
  return <div className="flex flex-col gap-3">{banners}</div>;
}

function MessageBanner({
  notice,
  name,
  onClose,
}: {
  notice: ContributeFairUseNotice;
  name: string;
  onClose?: () => void;
}) {
  return (
    <Banner
      tone="warning"
      name={name}
      title={FAIR_USE_TITLE}
      actions={<MessageActions notice={notice} />}
      onClose={onClose}
    >
      <FairUseMessage notice={notice} />
    </Banner>
  );
}

/**
 * The line over the list while it is cut, in place of the line on its size: the cut's sentence and its message's answer
 * page. It cannot be closed, so the reason stays after the message's banner is closed.
 */
export function ListCutLine({ listCut }: { listCut: { text: string; noticeId: string } }) {
  return (
    <p className="text-sm text-muted-foreground" data-list-cut={listCut.noticeId}>
      {listCut.text}{' '}
      <Link href={fairUseAnswerPathOf(listCut.noticeId)} prefetch={false} className={LINK}>
        Answer
      </Link>
    </p>
  );
}
