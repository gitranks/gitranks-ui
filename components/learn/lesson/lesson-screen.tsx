import { LessonLive } from './lesson-live';
import { lessonPartsOf } from './lesson-view';
import { JsonLd } from '@/components/json-ld/json-ld';
import type { LearnLessonPage } from '@/lib/learn/lesson-page.data';
import { learnLessonMarkdownPath, lessonMistakeHref } from '@/lib/learn/paths';
import { learnLessonJsonLd } from '@/lib/learn/seo/lesson';

/**
 * A lesson of ours as its route draws it: the same for everyone, rendered on the server with its code highlighted,
 * then the person's side read in the browser (`LessonLive`), with its structured data. Its footer links its Markdown
 * copy. `openFact`: opened from a shared fact (`?fact`).
 */
export function LessonScreen({ page, openFact = false }: { page: LearnLessonPage; openFact?: boolean }) {
  const { lesson, examples, questionCodes, group } = page;
  const links = { markdown: learnLessonMarkdownPath(lesson.slug), report: lessonMistakeHref(lesson.title) };
  const parts = lessonPartsOf({ lesson, examples, group, links });
  return (
    <>
      <JsonLd payloads={learnLessonJsonLd(lesson)} />
      <LessonLive
        lesson={lesson}
        group={group}
        questionCodes={questionCodes}
        article={parts.article}
        more={parts.more}
        openFact={openFact}
      />
    </>
  );
}
