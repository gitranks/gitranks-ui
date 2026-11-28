'use client';

import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

import { ShareButton } from '@/components/share/share-button';
import { Button } from '@/components/ui/button';
import type { SkillsMine } from '@/lib/skills/skills.types';
import { stripOf } from '@/lib/skills/skills-owner';

/**
 * The strip at the top of the owner's own Skills page: who can see it, with "Copy link" and "Hide this page" on a page
 * everyone sees, "Show it to everyone" on a hidden one, and "Your progress" for someone who learns. It has one height
 * in every state, so hiding and showing change it in place.
 */
export function SkillsStrip({
  mine,
  href,
  onHide,
  onShow,
  pending = false,
  build = false,
}: {
  mine: Pick<SkillsMine, 'state' | 'usesLearn'>;
  /** The page's address, which "Copy link" copies. */
  href: string;
  onHide?: () => void;
  onShow?: () => void;
  /** A press is on its way: the buttons wait. */
  pending?: boolean;
  /** Build is open to the owner: an empty page's line names building a project too. */
  build?: boolean;
}) {
  const strip = stripOf(mine, build);
  const Icon = mine.state === 'PUBLIC' ? Eye : EyeOff;
  return (
    <div
      className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-dashed px-4 py-2.5"
      data-skills-strip={mine.state}
    >
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span>
          <b className="font-semibold text-foreground">{strip.strong}</b>
          {strip.rest}
        </span>
      </span>
      {strip.actions.length || strip.progress ? (
        <span className="flex flex-wrap items-center gap-2">
          {strip.actions.includes('copy') ? <ShareButton href={href} label="Copy link" /> : null}
          {strip.actions.includes('hide') ? (
            <Button variant="outline" size="sm" className="max-sm:min-h-11" onClick={onHide} disabled={pending}>
              Hide this page
            </Button>
          ) : null}
          {strip.actions.includes('show') ? (
            <Button variant="outline" size="sm" className="max-sm:min-h-11" onClick={onShow} disabled={pending}>
              Show it to everyone
            </Button>
          ) : null}
          {strip.progress ? (
            <Link
              href={strip.progress}
              prefetch={false}
              className="px-2 text-sm font-medium text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center"
            >
              Your progress
            </Link>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
