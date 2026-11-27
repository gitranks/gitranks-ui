import type { ReactNode } from 'react';

import { LessonMarkdown } from './lesson-markdown';
import { ExampleBlock } from '@/components/learn/blocks/example-block';
import { QuoteBlock } from '@/components/learn/blocks/quote-block';
import { VisualBlock } from '@/components/workspace/blocks/visual-block';
import { bodyPartsOf, type HighlightedExample, type LearnLesson, visualsOf } from '@/lib/learn/lesson-page';

export type { HighlightedExample } from '@/lib/learn/lesson-page';

/**
 * The lesson itself: its one title, then its text with each example and visual where the text places it (the main
 * example after the text when the text places none). A quote of a project's code shows as a quote, in its one
 * language. `end`: a line after the text, the last thing of the article (a sentence about the group's topic in
 * interviews).
 */
export function LessonArticle({
  lesson,
  examples,
  mainLanguage,
  end = null,
}: {
  lesson: Pick<LearnLesson, 'slug' | 'title' | 'body' | 'visuals'>;
  examples: readonly HighlightedExample[];
  /** The learner's main language, when the page knows it. */
  mainLanguage?: string | null;
  end?: ReactNode;
}) {
  const visuals = visualsOf(lesson.visuals);
  const shown = examples.filter((example) => example.codes.length);
  const parts = bodyPartsOf(lesson.body, {
    examples: shown.map((example) => example.name),
    visuals: Object.keys(visuals),
  });
  return (
    <article className="flex min-w-0 flex-col gap-5" data-lesson-article="">
      <h1 className="m-0 text-2xl font-bold tracking-tight text-balance lg:text-3xl">{lesson.title}</h1>
      {parts.map((part, index) => {
        // Parts never move: the index is the part.
        if (part.kind === 'text') return <LessonMarkdown key={index} markdown={part.markdown} />;
        if (part.kind === 'visual') {
          return <VisualBlock key={index} visual={visuals[part.name]} id={`${lesson.slug}-visual-${part.name}`} />;
        }
        const example = shown.find((entry) => entry.name === part.name);
        if (!example) return null;
        if (example.source) {
          return (
            <QuoteBlock key={index} code={example.codes[0]} source={example.source} project={example.project ?? null} />
          );
        }
        return <ExampleBlock key={index} codes={example.codes} main={mainLanguage} />;
      })}
      {end}
    </article>
  );
}
