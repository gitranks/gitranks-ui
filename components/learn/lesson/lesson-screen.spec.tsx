// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./lesson-live', () => ({ LessonLive: ({ more }: { more: ReactNode }) => <div>{more}</div> }));

const { LessonScreen } = await import('./lesson-screen');
const { setGroup, setLesson } = await import('@/lib/learn/__fixtures__/lesson-page');
const { learnLessonJsonLd } = await import('@/lib/learn/seo/lesson');

const page = { lesson: setLesson, examples: [], questionCodes: [], group: setGroup };

const drawn = () => {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(<LessonScreen page={page} />);
  return host;
};

describe("a lesson's screen", () => {
  it('carries its structured data: the lesson and its breadcrumbs', () => {
    const scripts = [...drawn().querySelectorAll('script[type="application/ld+json"]')];
    expect(scripts.map((script) => JSON.parse(script.innerHTML))).toEqual(learnLessonJsonLd(setLesson));
  });

  it('links its Markdown version in the footer', () => {
    const link = [...drawn().querySelectorAll('a')].find((a) => a.textContent === 'Markdown version');
    expect(link?.getAttribute('href')).toBe('/learn/lessons/find-duplicates-with-a-set.md');
  });
});
