import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { type QuestionItem, QuestionsBlock } from './questions-block';

const ITEMS: QuestionItem[] = [
  { question: 'Does it cost anything?', answer: 'It is free.' },
  {
    question: 'How is a rank calculated?',
    answerText: 'From stars, on <your> repositories.',
    answer: (
      <>
        From stars, on &lt;your&gt; repositories. <a href="/methodology">How rankings work</a>
      </>
    ),
  },
];

const jsonLdOf = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(([, json]) => JSON.parse(json));

describe('QuestionsBlock', () => {
  it('writes the questions out as a list, laid out by the caller, with no structured data unless asked', () => {
    expect(renderToStaticMarkup(<QuestionsBlock items={ITEMS} className="flex flex-col gap-5.5" />)).toBe(
      '<dl class="flex flex-col gap-5.5">' +
        '<div class="flex flex-col gap-1"><dt class="font-semibold">Does it cost anything?</dt>' +
        '<dd class="text-muted-foreground">It is free.</dd></div>' +
        '<div class="flex flex-col gap-1"><dt class="font-semibold">How is a rank calculated?</dt>' +
        '<dd class="text-muted-foreground">From stars, on &lt;your&gt; repositories. <a href="/methodology">How rankings work</a></dd></div>' +
        '</dl>',
    );
  });

  it('folds each answer under its question as details', () => {
    expect(
      renderToStaticMarkup(
        <QuestionsBlock variant="details" items={ITEMS.slice(0, 1)} className="grid gap-x-8 lg:grid-cols-2" />,
      ),
    ).toBe(
      '<div class="grid gap-x-8 lg:grid-cols-2"><details class="group border-b py-4">' +
        '<summary class="flex cursor-pointer list-none items-center [&amp;::-webkit-details-marker]:hidden justify-between gap-4 font-medium">' +
        'Does it cost anything?' +
        '<span aria-hidden="true" class="text-muted-foreground transition-transform group-open:rotate-45">+</span>' +
        '</summary><p class="mt-2 text-sm text-muted-foreground">It is free.</p></details></div>',
    );
  });

  it('says the same questions and answers in FAQPage structured data, before the block, in either variant', () => {
    for (const variant of ['list', 'details'] as const) {
      const html = renderToStaticMarkup(<QuestionsBlock variant={variant} jsonLd items={ITEMS} />);
      expect(html.startsWith('<script type="application/ld+json">')).toBe(true);
      expect(jsonLdOf(html)).toEqual([
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'Does it cost anything?',
              acceptedAnswer: { '@type': 'Answer', text: 'It is free.' },
            },
            {
              '@type': 'Question',
              name: 'How is a rank calculated?',
              acceptedAnswer: { '@type': 'Answer', text: 'From stars, on <your> repositories.' },
            },
          ],
        },
      ]);
      // Every answer's structured text is on the page, word for word.
      const shown = html
        .replace(/<script.*?<\/script>/g, '')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>');
      for (const { name, acceptedAnswer } of jsonLdOf(html)[0].mainEntity) {
        expect(shown).toContain(name);
        expect(shown).toContain(acceptedAnswer.text);
      }
    }
  });
});
