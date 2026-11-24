import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

const { LessonStubScreen } = await import('./lesson-stub');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

describe('a closed lesson', () => {
  it.each([
    ['REMOVED', 'This lesson was removed by its author'],
    ['HIDDEN', 'This lesson is not available'],
    ['HELD', 'This lesson is paused'],
  ] as const)('%s says so, and names nothing about the lesson', (visibility, title) => {
    const html = renderToStaticMarkup(<LessonStubScreen visibility={visibility} />);
    expect(text(html)).toContain(title);
    expect(html).not.toContain('driftwood');
  });

  it('names nothing at an address that opens nothing, not even GitRanks Learn', () => {
    const html = renderToStaticMarkup(<LessonStubScreen visibility="MISSING" />);
    expect(text(html)).toContain('This page is not available');
    expect(text(html)).not.toMatch(/learn|lesson/i);
    expect(html).not.toContain('/learn/maintainers');
  });
});
