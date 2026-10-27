'use client';

import type { RefObject } from 'react';

import { badgeAlt, FORMAT_GROUPS, type OfferedBadge } from '../utils/badge-options';
import { BadgeImage, usePageTheme } from './badge-image';
import { EntityChip } from './entity-chip';
import type { EntityFacts } from '@/badge/v3/facts';
import { cn } from '@/lib/utils';

type BadgeStepProps = {
  headingRef: RefObject<HTMLHeadingElement | null>;
  facts: EntityFacts;
  offered: OfferedBadge[];
  notice: string | null;
  changeHref: string;
  onChange: () => void;
  onPick: (offered: OfferedBadge) => void;
};

/** Step 2: the entity's available badges, drawn live, grouped Shields · Cards · Charts. */
export function BadgeStep({
  headingRef,
  facts,
  offered,
  notice,
  changeHref,
  onChange,
  onPick,
}: Readonly<BadgeStepProps>) {
  const theme = usePageTheme();

  return (
    <section className="flex flex-col gap-5" aria-labelledby="builder-badge-heading">
      <EntityChip facts={facts} changeHref={changeHref} onChange={onChange} />
      <h2 id="builder-badge-heading" ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        Pick a badge
      </h2>
      {notice && (
        <p role="alert" className="rounded-md border border-negative/30 bg-negative/5 px-3 py-2 text-sm">
          {notice}
        </p>
      )}
      {!offered.length && (
        <p className="text-sm text-muted-foreground">
          No badge has anything to show for this {facts.kind === 'repo' ? 'repository' : 'account'} yet. Badges appear
          once it is ranked.
        </p>
      )}
      {FORMAT_GROUPS.map(({ format, name }) => {
        const group = offered.filter(({ badge }) => badge.format === format);
        if (!group.length) return null;
        const headingId = `builder-group-${format}`;
        return (
          <div key={format} className="flex flex-col gap-2">
            <h3 id={headingId} className="text-sm font-semibold">
              {name} <span className="font-normal text-muted-foreground">· {group.length} available</span>
            </h3>
            <ul
              aria-labelledby={headingId}
              className={cn('grid gap-2', format === 'chart' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}
            >
              {group.map((each) => (
                <li key={each.badge.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onPick(each)}
                    className="flex min-h-12 w-full items-center justify-center rounded-lg border bg-card p-3 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <BadgeImage
                      facts={facts}
                      badge={each.badge}
                      style={each.style}
                      theme={theme}
                      alt={badgeAlt(facts, each.badge, each.style)}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
