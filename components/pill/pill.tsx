import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PILL_TONES = {
  neutral: 'bg-muted text-foreground/80',
  green: 'bg-positive/10 text-positive-strong',
  violet: 'bg-brand-soft text-brand-soft-foreground',
  amber: 'bg-warning-soft text-warning-soft-foreground',
  red: 'bg-negative/10 text-negative-strong',
} as const;

/**
 * A word or two on a soft fill of its tone: a state, a label, a mark. `small` is the one beside a menu item ("Beta",
 * "New"): smaller type and no border, so it sits on the item's line.
 */
export function Pill({
  children,
  tone = 'neutral',
  size = 'default',
}: {
  children: ReactNode;
  tone?: keyof typeof PILL_TONES;
  size?: 'default' | 'small';
}) {
  if (size === 'small') {
    return (
      <span className={cn('rounded-full px-1.5 py-px text-[11px] font-semibold', PILL_TONES[tone])}>{children}</span>
    );
  }
  return (
    <Badge variant="secondary" className={PILL_TONES[tone]}>
      {children}
    </Badge>
  );
}
