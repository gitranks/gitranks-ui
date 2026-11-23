import { type HighlightedExample, LessonArticle } from './lesson-article';
import { LessonFooter, type LessonFooterLinks, LessonNeighbours } from './lesson-more';
import { type LessonCalls, type LessonDrawn, LessonPlayer, type LessonViewer } from './lesson-player';
import type { HighlightedCode } from '@/lib/learn/code-tokens';
import { type LearnGroupLesson, type LearnLesson, lessonPlaceOf } from '@/lib/learn/lesson-page';

export type { HighlightedExample } from './lesson-article';
export type { LessonFooterLinks } from './lesson-more';
export type { LessonCalls, LessonDrawn, LessonViewer } from './lesson-player';

/** Everything a lesson's page draws from: plain data and the page's calls. */
export type LessonViewProps = {
  lesson: LearnLesson;
  /** The lesson's examples as the server highlighted them. */
  examples: readonly HighlightedExample[];
  /** The question's own code, highlighted, when it shows code. */
  questionCodes?: readonly HighlightedCode[];
  /** The lessons of the lesson's group, in order. */
  group: readonly LearnGroupLesson[];
  /** The signed-in person's side; null for a visitor. */
  viewer: LessonViewer | null;
  mainLanguage?: string | null;
  links: LessonFooterLinks;
  calls: LessonCalls;
  /** For the catalogue: a state drawn as it stands, the key hints, the clock. */
  drawn?: LessonDrawn;
  hints?: boolean;
  now?: Date;
  timeZone?: string;
};

/**
 * A lesson's page under the site's header: the player's strip; the lesson, its question and what it gives after the
 * answer; previous and next; the line about who wrote it. Two columns, the question beside the text and in sight as
 * the text scrolls; one on a phone, the question after the text.
 */
export function LessonView({ lesson, examples, group, links, mainLanguage, ...player }: LessonViewProps) {
  const place = lessonPlaceOf(group, lesson.slug, null);
  return (
    <LessonPlayer
      lesson={lesson}
      group={group}
      mainLanguage={mainLanguage}
      article={<LessonArticle lesson={lesson} examples={examples} mainLanguage={mainLanguage} />}
      more={
        <>
          <LessonNeighbours lesson={lesson} place={place} />
          <LessonFooter changedAt={lesson.changedAt} links={links} />
        </>
      }
      {...player}
    />
  );
}
