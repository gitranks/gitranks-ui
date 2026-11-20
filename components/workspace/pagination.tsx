import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEP = cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'gap-1 px-2.5');

/**
 * A history list's pages (decision 6): "1–20 of 46 pull requests" and Previous / Next as links, the page in the
 * address. When everything fits on one page it is absent, or with `always` the range alone ("1–7 of 7 lessons"), for
 * a list whose total is said nowhere else.
 */
export function Pagination({
  page,
  pageSize = 20,
  total,
  noun,
  hrefOf,
  always = false,
}: {
  page: number;
  pageSize?: number;
  total: number;
  /** One of what the list holds: "pull request". */
  noun: string;
  hrefOf: (page: number) => Route;
  always?: boolean;
}) {
  if (total <= 0 || (total <= pageSize && !always)) return null;
  const last = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground" data-pagination="">
      <span>
        {from}–{to} of {total} {total === 1 ? noun : `${noun}s`}
      </span>
      <nav aria-label="Pages" className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={hrefOf(page - 1)} prefetch={false} rel="prev" aria-label="Previous page" className={STEP}>
            <ChevronLeftIcon aria-hidden="true" />
            <span className="hidden sm:block">Previous</span>
          </Link>
        ) : null}
        {page < last ? (
          <Link href={hrefOf(page + 1)} prefetch={false} rel="next" aria-label="Next page" className={STEP}>
            <span className="hidden sm:block">Next</span>
            <ChevronRightIcon aria-hidden="true" />
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
