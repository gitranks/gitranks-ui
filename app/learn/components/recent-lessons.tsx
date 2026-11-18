import Link from 'next/link';

import { H2, WIDTH } from '@/app/contribute/components/landing';
import type { PublicLesson } from '@/lib/learn/learn.types';
import { lessonPath } from '@/lib/learn/learn-path';
import { cn } from '@/lib/utils';

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** A lesson's publishing day, as `18 Nov 2026`; empty for a date that does not parse. */
export function publishedDayOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DAY.format(date);
}

/**
 * The newest shared lessons, each a link to its page: anyone reads one without signing in. Left out when there are
 * none (none shared yet, or the API did not answer). It follows "What every lesson covers" on the front door, so it
 * has no top padding of its own.
 */
export function RecentLessons({ lessons }: { lessons: PublicLesson[] }) {
  if (!lessons.length) return null;
  return (
    <section aria-labelledby="recent-lessons" className={cn(WIDTH, 'flex flex-col gap-7 pb-11 sm:pb-16')}>
      <div className="flex flex-col gap-2">
        <h2 id="recent-lessons" className={H2}>
          Recent lessons
        </h2>
        <p className="max-w-prose text-muted-foreground">
          Lessons from real fixes, shared by the people who passed them. Open one and read it, no sign-in needed.
        </p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-4" data-recent-lessons>
        {lessons.map((lesson) => {
          const day = publishedDayOf(lesson.publishedAt);
          return (
            <li key={lesson.slug} className="flex">
              <Link
                href={lessonPath(lesson.slug)}
                prefetch={false}
                className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-foreground/30"
              >
                <span className="font-semibold text-balance">{lesson.title}</span>
                <span className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {lesson.repo ? <span className="min-w-0 truncate font-mono">{lesson.repo}</span> : null}
                  {lesson.language ? <span>{lesson.language}</span> : null}
                  {day ? <time dateTime={lesson.publishedAt}>{day}</time> : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
