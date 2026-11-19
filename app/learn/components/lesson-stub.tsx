import Link from 'next/link';

import type { LessonVisibility } from '@/lib/learn/learn.types';
import { LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import { stubTextOf } from '@/lib/learn/lesson-public';

/** The unnamed 404: an address that opens nothing. */
const UNNAMED = { title: 'This page is not available', text: 'The address may be wrong, or the page was hidden.' };

/**
 * A lesson link that no longer opens a lesson: removed by its author, or (the lesson page alone) paused while reports
 * on its questions are read; `MISSING` is the 404 of an unknown or hidden lesson, or a login with no public pass. It
 * names no title, author or subject: the API gives none.
 */
export function LessonStubScreen({
  visibility,
  named = true,
}: {
  visibility: LessonVisibility | 'MISSING';
  /** Whether it names GitRanks Learn: the 404 of an unknown address does not while Learn is not open to everyone. */
  named?: boolean;
}) {
  const { title, text } = named ? stubTextOf(visibility) : UNNAMED;
  return (
    <main className="flex flex-col" data-lesson-stub={visibility}>
      <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 px-4 pt-16 pb-24">
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {named ? 'GitRanks Learn' : 'GitRanks'}
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-balance">{title}</h1>
        <p className="text-lg text-foreground/80">{text}</p>
        {named ? (
          <Link
            href={LEARN_MAINTAINERS_PATH}
            prefetch={false}
            className="text-sm font-semibold text-link hover:underline"
          >
            What is GitRanks Learn?
          </Link>
        ) : null}
      </section>
    </main>
  );
}
