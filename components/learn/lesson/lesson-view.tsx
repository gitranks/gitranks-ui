import type { ReactNode } from 'react';

import { type HighlightedExample, LessonArticle } from './lesson-article';
import { LessonFooter, type LessonFooterLinks, LessonNeighbours } from './lesson-more';
import {
  type LessonCalls,
  type LessonDrawn,
  LessonPlayer,
  type LessonViewer,
  lessonPlayerKeyOf,
} from './lesson-player';
import type { HighlightedCode } from '@/lib/learn/code-tokens';
import { type LearnGroupLesson, type LearnLesson, lessonPlaceOf } from '@/lib/learn/lesson-page';
import type { LessonReal } from '@/lib/learn/real-issues';

export type { HighlightedExample } from './lesson-article';
export type { LessonFooterLinks } from './lesson-more';
export type { LessonCalls, LessonDrawn, LessonViewer } from './lesson-player';
export { lessonPlayerKeyOf } from './lesson-player';

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
  /** Opened from a shared fact (its address ends in `?fact`): "Did you know?" starts open. */
  openFact?: boolean;
  /** For the catalogue: a state drawn as it stands, the key hints. */
  drawn?: LessonDrawn;
  hints?: boolean;
  /** The clock and the person's time zone: with both, the server draws the review's words; else the browser does. */
  now?: Date;
  timeZone?: string;
  /** The person's real issues for the lesson, and "In the real world" drawn: for the catalogue. */
  real?: LessonReal | null;
  realWorld?: ReactNode;
};

/** The parts of a lesson's page that render on the server: the lesson, then previous and next and the footer. */
export function lessonPartsOf({
  lesson,
  examples,
  group,
  links,
  mainLanguage,
}: Pick<LessonViewProps, 'lesson' | 'examples' | 'group' | 'links' | 'mainLanguage'>) {
  const place = lessonPlaceOf(group, lesson.slug, null);
  return {
    article: <LessonArticle lesson={lesson} examples={examples} mainLanguage={mainLanguage} />,
    more: (
      <>
        <LessonNeighbours lesson={lesson} place={place} />
        <LessonFooter changedAt={lesson.changedAt} links={links} />
      </>
    ),
  };
}

/**
 * A lesson's page under the site's header: the player's strip; the lesson, its question and what it gives after the
 * answer; previous and next; the line about who wrote it. Two columns, the question beside the text and in sight as
 * the text scrolls; one on a phone, the question after the text. The player is keyed by the lesson and its question
 * (`lessonPlayerKeyOf`).
 */
export function LessonView({ lesson, examples, group, links, mainLanguage, ...player }: LessonViewProps) {
  return (
    <LessonPlayer
      key={lessonPlayerKeyOf(lesson)}
      lesson={lesson}
      group={group}
      mainLanguage={mainLanguage}
      {...lessonPartsOf({ lesson, examples, group, links, mainLanguage })}
      {...player}
    />
  );
}
