import Link from 'next/link';

import { cn } from '@/lib/utils';
import { type LimitCounts, limitWordsOf } from '@/lib/workspace/limit-words';
import { WORKSPACE_ANCHORS, WORKSPACE_PATHS } from '@/lib/workspace/paths';

/**
 * The limit on open pull requests reached, in its one wording (decision 7), with the way to the pull requests and to
 * the limit itself.
 */
export function LimitNotice({ count, limit, open, className }: LimitCounts & { className?: string }) {
  const { lead, rest } = limitWordsOf({ count, limit, open });
  return (
    <p
      role="status"
      data-limit-notice={count}
      className={cn('rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground', className)}
    >
      <span className="font-semibold text-foreground">{lead}</span> {rest}{' '}
      <Link href={WORKSPACE_PATHS.pullRequests} prefetch={false} className="font-semibold text-link hover:underline">
        Pull requests
      </Link>
      {' · '}
      <Link href={WORKSPACE_ANCHORS.limitRow} prefetch={false} className="font-semibold text-link hover:underline">
        Change the limit in Settings
      </Link>
    </p>
  );
}
