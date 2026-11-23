import { LessonLive } from './lesson-live';
import { lessonPartsOf } from './lesson-view';
import type { LearnLessonPage } from '@/lib/learn/lesson-page.data';
import { lessonMistakeHref } from '@/lib/learn/paths';

/**
 * A lesson of ours as its route draws it: the same for everyone, rendered on the server with its code highlighted,
 * then the person's side read in the browser (`LessonLive`). `openFact`: opened from a shared fact (`?fact`).
 */
export function LessonScreen({ page, openFact = false }: { page: LearnLessonPage; openFact?: boolean }) {
  const { lesson, examples, questionCodes, group } = page;
  const parts = lessonPartsOf({ lesson, examples, group, links: { report: lessonMistakeHref(lesson.title) } });
  return (
    <LessonLive
      lesson={lesson}
      group={group}
      questionCodes={questionCodes}
      article={parts.article}
      more={parts.more}
      openFact={openFact}
    />
  );
}
