'use client';

import { Check } from 'lucide-react';

import { BADGE_CHECK_COPY, badgeCheckViewOf } from '../utils/badge-check';
import type { BadgeCheckKind, BadgeCheckResult } from '@/types/daily-updates.types';

type BadgeCheckStatusProps = {
  kind: BadgeCheckKind;
  name: string;
  result: BadgeCheckResult | null;
  checking: boolean;
};

/**
 * What "Check my badge" answered, in a few lines, where a link started the check (the profile's sign-in dialog).
 * Always rendered, so a screen reader hears the answer when it comes; empty before the first check, when it takes back
 * the gap the dialog puts before it.
 */
export function BadgeCheckStatus({ kind, name, result, checking }: Readonly<BadgeCheckStatusProps>) {
  const view = result && !checking ? badgeCheckViewOf(kind, name, result) : null;

  return (
    <div aria-live="polite" className="flex flex-col gap-1 text-xs empty:-mt-3">
      {checking && <p className="text-muted-foreground">{BADGE_CHECK_COPY.checking}</p>}
      {view && (
        <p className={view.state === 'found' ? 'flex items-center gap-2 font-medium' : undefined}>
          {view.state === 'found' && <Check className="size-4 shrink-0" aria-hidden />}
          <span>{view.text}</span>
        </p>
      )}
      {view?.note && <p className="text-muted-foreground">{view.note}</p>}
    </div>
  );
}
