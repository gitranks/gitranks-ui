import type { FC } from 'react';

import { formatShare } from '@/lib/rankings/summary-ranking';

type ShareBarProps = {
  /** This row's share of everything ranked, 0–1. */
  share: number;
  /** The first row's share: its bar runs full width. */
  leadShare: number;
  /** Writes the share beside the bar. */
  showShare?: boolean;
};

/** A row's part of the whole, as a quiet bar the length of its share against the leader's. */
export const ShareBar: FC<ShareBarProps> = ({ share, leadShare, showShare = true }) => {
  const width = leadShare > 0 ? Math.max(2, Math.min(100, (share / leadShare) * 100)) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-muted-foreground/50" style={{ width: `${width.toFixed(1)}%` }} />
      </div>
      {showShare && (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          <span className="sr-only">Share: </span>
          {formatShare(share)}
        </span>
      )}
    </div>
  );
};
