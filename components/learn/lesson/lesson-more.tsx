import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

import {
  checkedDateOf,
  isFirstOfGroup,
  isLastOfGroup,
  type LearnLesson,
  type LessonPlace,
} from '@/lib/learn/lesson-page';
import { learnLessonPath } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';

const CARD = 'flex flex-col gap-1 rounded-xl border bg-card p-4 hover:bg-accent';

/**
 * Previous and next: two cards, the next one always on the right. On a group's first or last lesson the card says it
 * goes to another group.
 */
export function LessonNeighbours({
  lesson,
  place,
}: {
  lesson: Pick<LearnLesson, 'previous' | 'next' | 'group'>;
  place: Pick<LessonPlace, 'index' | 'count'>;
}) {
  if (!lesson.previous && !lesson.next) return null;
  return (
    <nav className="grid grid-cols-2 gap-3" aria-label={`More in ${lesson.group.title}`} data-lesson-neighbours="">
      {lesson.previous ? (
        <Link href={learnLessonPath(lesson.previous.slug)} className={CARD} data-lesson-previous="">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
            {isFirstOfGroup(place) ? 'Previous group' : 'Previous lesson'}
          </span>
          <span className="text-sm font-medium">{lesson.previous.title}</span>
        </Link>
      ) : null}
      {lesson.next ? (
        <Link
          href={learnLessonPath(lesson.next.slug)}
          className={cn(CARD, 'col-start-2 text-right')}
          data-lesson-next=""
        >
          <span className="inline-flex items-center justify-end gap-2 text-xs text-muted-foreground">
            {isLastOfGroup(place) ? 'Next group' : 'Next lesson'}
            <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium">{lesson.next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}

/** The addresses the footer links to: the lesson's Markdown copy, and where a mistake is reported. */
export type LessonFooterLinks = { markdown: string; report: string };

/** The line under the lesson: who wrote it, when it was last checked, its Markdown copy, and a way to report a mistake. */
export function LessonFooter({ changedAt, links }: { changedAt: string; links: LessonFooterLinks }) {
  const checked = checkedDateOf(changedAt);
  return (
    <p className="m-0 text-xs text-muted-foreground" data-lesson-footer="">
      Written and checked by GitRanks{checked ? ` · last checked ${checked}` : ''} ·{' '}
      <a href={links.markdown} className="hover:underline">
        Markdown version
      </a>{' '}
      ·{' '}
      <a href={links.report} className="hover:underline">
        Report a mistake
      </a>
    </p>
  );
}
