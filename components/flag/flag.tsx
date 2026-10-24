import type { FC } from 'react';

import { cn } from '@/lib/utils';

/**
 * A flag emoji in its own box. Kept out of the text it labels: iOS Safari paints the text after a
 * flag in one of the flag's colours when both sit in one truncated (text-overflow) run.
 */
export const Flag: FC<{ flag?: string | null; label?: string | null; className?: string }> = ({
  flag,
  label,
  className,
}) => {
  if (!flag) {
    return null;
  }

  // Named for screen readers only where the country is not written next to it.
  return label ? (
    <span role="img" aria-label={label} className={cn('shrink-0', className)}>
      {flag}
    </span>
  ) : (
    <span aria-hidden="true" className={cn('shrink-0', className)}>
      {flag}
    </span>
  );
};
