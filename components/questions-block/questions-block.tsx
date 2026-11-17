import type { ReactNode } from 'react';

import { JsonLd } from '@/components/json-ld/json-ld';

/**
 * A question and its answer. An answer that is plain text is also what the structured data says; one with more in it
 * (a link after the text) names its text in `answerText`.
 */
export type QuestionItem = { question: string } & (
  | { answer: string; answerText?: string }
  | { answer: ReactNode; answerText: string }
);

const answerTextOf = ({ answer, answerText }: QuestionItem) => answerText ?? (typeof answer === 'string' ? answer : '');

/** The items as a schema.org `FAQPage`. */
const faqPageOf = (items: readonly QuestionItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: answerTextOf(item) },
  })),
});

/**
 * A page's questions and answers: `list` writes them out one under another, `details` folds each answer under its
 * question. `className` lays the items out (columns, gaps, the block's place on the page). With `jsonLd` the same items
 * are also the page's `FAQPage` structured data, so what a visitor reads and what a search engine reads stay one text.
 */
export function QuestionsBlock({
  items,
  variant = 'list',
  jsonLd = false,
  className,
}: {
  items: readonly QuestionItem[];
  variant?: 'list' | 'details';
  jsonLd?: boolean;
  className?: string;
}) {
  return (
    <>
      {jsonLd ? <JsonLd payloads={[faqPageOf(items)]} /> : null}
      {variant === 'details' ? (
        <div className={className}>
          {items.map(({ question, answer }) => (
            <details key={question} className="group border-b py-4">
              <summary className="flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden justify-between gap-4 font-medium">
                {question}
                <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{answer}</p>
            </details>
          ))}
        </div>
      ) : (
        <dl className={className}>
          {items.map(({ question, answer }) => (
            <div key={question} className="flex flex-col gap-1">
              <dt className="font-semibold">{question}</dt>
              <dd className="text-muted-foreground">{answer}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
