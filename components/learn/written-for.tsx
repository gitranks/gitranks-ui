import Link from 'next/link';

import { writtenForOf } from '@/lib/learn/lesson-format';
import { cn } from '@/lib/utils';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/**
 * Who the lesson was written for: "Written for your goal: learn TypeScript, level some." with a link to change them
 * (`short`: "Change"). Without the lesson's own words yet, what it will be written for.
 */
export function WrittenFor({
  writtenFor,
  short = false,
  author = false,
  className,
}: {
  writtenFor: string | null | undefined;
  short?: boolean;
  /** A shared lesson: written for its author's goal, which the reader cannot change. */
  author?: boolean;
  className?: string;
}) {
  const parts = writtenForOf(writtenFor);
  if (author) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        {parts ? (
          <>
            Written for its author's goal: <span className="font-medium text-foreground">{parts.goal}</span>
            {parts.level ? (
              <>
                , level <span className="font-medium text-foreground">{parts.level}</span>
              </>
            ) : null}
            .
          </>
        ) : (
          "Written for its author's goal and level."
        )}
      </p>
    );
  }
  const change = (
    <Link href={WORKSPACE_PATHS.settingsGoal} prefetch={false} className="text-link hover:underline">
      {short ? 'Change' : 'Change goal and level'}
    </Link>
  );
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {parts ? (
        <>
          Written for your goal: <span className="font-medium text-foreground">{parts.goal}</span>
          {parts.level ? (
            <>
              , level <span className="font-medium text-foreground">{parts.level}</span>
            </>
          ) : null}
          .
        </>
      ) : (
        'Written for your goal and level.'
      )}{' '}
      {change}
    </p>
  );
}
