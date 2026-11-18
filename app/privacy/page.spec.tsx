import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/header/header', () => ({ Header: () => null }));

const { default: Privacy } = await import('./page');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

describe('the Privacy policy', () => {
  const html = renderToStaticMarkup(<Privacy />);
  const plain = text(html);

  it('has a GitRanks Learn section, linked from the contents and dated', () => {
    expect(html).toContain('id="learn"');
    expect(html).toContain('href="#learn"');
    expect(plain).toContain('18 November 2026');
  });

  it('says what Learn makes public, under whose name, and what deleting removes', () => {
    expect(plain).toContain('the lesson becomes public under your GitHub username');
    expect(plain).toContain('never the options you got wrong');
    expect(plain).toContain('Its form for machines also gives your GitHub account id');
    expect(plain).toContain('anyone signed in with GitHub can say whether a lesson result helped');
    expect(plain).toContain(
      'may be shown on the result page with their username, avatar and role; others are never shown',
    );
    expect(plain).toContain('counts of visits to pages that name your account');
    expect(plain).toContain("other people's results on them included");
    expect(plain).toContain('Learn data: until you delete it or remove your data');
    expect(plain).toContain('Ways into Contribute and Learn pages: six months');
  });

  it('keeps the anchors other pages link to', () => {
    for (const id of ['removal', 'contribute', 'visitors', 'cookies']) expect(html).toContain(`id="${id}"`);
  });
});
