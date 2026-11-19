import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { FaqSection, InsightTicker } = await import('./landing-sections');
const { SegmentType } = await import('@/types/generated/graphql');

const QUESTIONS = [
  'How is my GitHub rank calculated?',
  'Why am I not ranked?',
  'What do the tiers mean?',
  'Can I refresh my profile?',
  'How do I add a badge to my README?',
];

/** The questions' links, by question: where each goes, what it says, and whether it is `nofollow`. */
const LINKS: Record<string, { href: string; label: string; rel?: string }> = {
  'How is my GitHub rank calculated?': { href: '/methodology', label: 'How rankings work' },
  'How do I add a badge to my README?': { href: '/badge/builder', label: 'Badge builder', rel: 'nofollow' },
};

/** Markup's text as a visitor reads it: the character references React writes, turned back. */
const plain = (html: string) =>
  html
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

/** Each `details` of the markup: its question, and its answer paragraph's markup. */
const entriesOf = (html: string) =>
  [
    ...html.matchAll(/<details[^>]*><summary[^>]*>(.*?)<span[^>]*>\+<\/span><\/summary><p[^>]*>(.*?)<\/p><\/details>/g),
  ].map(([, question, answer]) => ({ question: plain(question), answer }));

const faqPageOf = (html: string) => {
  const pages = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(([, json]) =>
    JSON.parse(json),
  );
  expect(pages).toHaveLength(1);
  return pages[0];
};

describe('FaqSection', () => {
  const html = renderToStaticMarkup(<FaqSection />);
  const entries = entriesOf(html);

  it('folds every question under its own details, in order', () => {
    expect(html.match(/<details/g)).toHaveLength(QUESTIONS.length);
    expect(entries.map(({ question }) => question)).toEqual(QUESTIONS);
  });

  it("ends an answer that has a link with the link and its label, inside the answer's paragraph", () => {
    for (const { question, answer } of entries) {
      const link = LINKS[question];
      if (!link) {
        expect(answer).not.toContain('<a ');
        continue;
      }
      const [text, anchor] = answer.split(/ (?=<a )/);
      expect(text).not.toBe('');
      expect(text).not.toContain('<');
      expect(anchor).toMatch(/^<a [^>]*>[^<]*<\/a>$/);
      expect(anchor).toContain(` href="${link.href}"`);
      expect(anchor.endsWith(`>${link.label}</a>`)).toBe(true);
      expect(anchor.match(/ rel="([^"]*)"/)?.[1]).toBe(link.rel);
    }
    expect(entries.filter(({ question }) => LINKS[question])).toHaveLength(Object.keys(LINKS).length);
  });

  it("says every question in the page's FAQPage data, in order, with the answer's text and not the link's label", () => {
    const page = faqPageOf(html);
    expect(page['@context']).toBe('https://schema.org');
    expect(page['@type']).toBe('FAQPage');
    expect(page.mainEntity).toEqual(
      entries.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: plain(answer.replace(/ <a .*$/, '')) },
      })),
    );
    for (const { acceptedAnswer } of page.mainEntity) {
      expect(acceptedAnswer.text).not.toBe('');
      for (const { label } of Object.values(LINKS)) {
        expect(acceptedAnswer.text.endsWith(label)).toBe(false);
      }
    }
  });
});

describe('InsightTicker', () => {
  it('shows the newest post with a link to its page', () => {
    const insight = {
      id: 'post-1',
      segments: [{ type: SegmentType.Text, text: 'A new rank for the week' }],
      entities: null,
    } as unknown as Parameters<typeof InsightTicker>[0]['insight'];
    const html = renderToStaticMarkup(<InsightTicker insight={insight} />);

    expect(html).toContain('A new rank for the week');
    expect(html).toMatch(/<a [^>]*href="\/insights\/post-1"[^>]*>Details<\/a>/);
  });

  it('draws nothing when there is no post', () => {
    expect(renderToStaticMarkup(<InsightTicker />)).toBe('');
  });
});
