import Link from 'next/link';

import { INTERVIEWS_COLUMN } from '@/components/interviews/column';
import { Button } from '@/components/ui/button';
import { INTERVIEWS_HOME_PATH } from '@/lib/interviews/paths';

/**
 * A plan taken down or removed: it says so, says that what was learned stays learned, and leads to the companies. The
 * person's run of it is kept and shown nowhere.
 */
export function PlanGone() {
  return (
    <main data-plan-gone className={INTERVIEWS_COLUMN}>
      <div className="flex flex-col gap-3">
        <h1 className="m-0 text-3xl font-bold tracking-tight text-balance">This plan is no longer here</h1>
        <p className="m-0 text-base leading-relaxed text-muted-foreground">
          It was taken down. The lessons you learned stay learned.
        </p>
        <div>
          <Button asChild size="lg" className="font-semibold">
            <Link href={INTERVIEWS_HOME_PATH}>See the companies</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
