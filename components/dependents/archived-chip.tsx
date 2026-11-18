import type { FC } from 'react';

import { cn } from '@/lib/utils';

/** "Archived", beside a repository's name: on its own page and in lists of repositories. */
export const ArchivedChip: FC<{ className?: string }> = ({ className }) => (
  <span className={cn(className, 'rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground')}>
    Archived
  </span>
);
