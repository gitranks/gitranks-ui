import type { FC } from 'react';

import { formatFull } from '@/badge/v3/format';
import { Button } from '@/components/ui/button';

type ShowMoreProps = {
  /** Rows shown. */
  shown: number;
  /** Rows the list holds. */
  total: number;
  onMore: () => void;
  loading?: boolean;
  /** A failed press, said beside the button. */
  error?: string | null;
};

/** "1–25 of 231" and, while there are more, a button that adds the next rows. */
export const ShowMore: FC<ShowMoreProps> = ({ shown, total, onMore, loading = false, error }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-t p-4 text-sm text-muted-foreground">
    <span className="font-mono tabular-nums">
      {shown > 0 ? `1–${formatFull(shown)}` : '0'} of {formatFull(total)}
    </span>
    {error && (
      <span role="alert" className="text-destructive">
        {error}
      </span>
    )}
    {shown < total && (
      <Button type="button" variant="outline" onClick={onMore} disabled={loading}>
        {loading ? 'Loading…' : 'Show more'}
      </Button>
    )}
  </div>
);
