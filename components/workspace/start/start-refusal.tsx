import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { LimitNotice } from '@/components/workspace/limit-notice';
import type { StartRefusalCopy } from '@/lib/workspace/start-refusals';

const box =
  'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3';
const link = 'inline-flex items-center text-sm font-semibold text-link hover:underline max-sm:min-h-11';

/** Why the issue can't be started now, and its one next step: a link, Resume, or the limit's own notice. */
export function StartRefusal({
  copy,
  code,
  resuming = false,
  onResume,
}: {
  copy: StartRefusalCopy;
  /** The API's refusal, marked on the block. */
  code: string;
  resuming?: boolean;
  onResume?: () => void;
}) {
  if (copy.kind === 'limit') {
    return (
      <div data-start-refusal={code}>
        <LimitNotice {...copy.counts} className="border-warning/30 bg-warning-soft" />
      </div>
    );
  }
  return (
    <div role="status" data-start-refusal={code} className={box}>
      <p className="max-w-prose text-sm font-medium">{copy.text}</p>
      {copy.kind === 'paused-by-you' ? (
        onResume ? (
          <Button
            type="button"
            onClick={onResume}
            disabled={resuming}
            className="min-h-11 px-5 font-semibold max-sm:w-full sm:min-h-10"
          >
            {resuming ? 'Resuming…' : 'Resume'}
          </Button>
        ) : null
      ) : copy.action?.external ? (
        <a href={copy.action.href} className={link}>
          {copy.action.label} →
        </a>
      ) : copy.action ? (
        <Link href={copy.action.href} prefetch={false} className={link}>
          {copy.action.label} →
        </Link>
      ) : null}
    </div>
  );
}
