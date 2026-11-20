import Link from 'next/link';

import { H2, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import type { PublicLesson } from '@/lib/learn/learn.types';
import { lessonPath } from '@/lib/learn/learn-path';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A lesson's publishing day in UTC, as `18 Nov 2026` whatever the runtime's locale data; empty for a bad date. */
export function publishedDayOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
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
          Shared by the people who passed them. Open one and read it, no sign-in needed.
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
