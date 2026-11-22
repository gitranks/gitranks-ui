import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/header/header', () => ({ Header: () => null }));
const { contributeShown } = vi.hoisted(() => ({ contributeShown: vi.fn(async () => false) }));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeShown }));

const { default: Privacy } = await import('./page');
const { ShownTermsRulesLink } = await import('./terms-rules-link');

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
    expect(plain).toContain('22 November 2026');
  });

  it('says what Learn makes public, under whose name, and what deleting removes', () => {
    expect(plain).toContain('the lesson becomes public under your GitHub username');
    expect(plain).toContain('never the options you got wrong');
    expect(plain).toContain('Its form for machines also gives your GitHub account id');
    expect(plain).toContain(
      'Your public results also show on your public progress page, with the Learn pull requests that were merged, and in the image a link to that page shows when it is posted.',
    );
    expect(plain).toContain('anyone signed in with GitHub can say whether a lesson result helped');
    expect(plain).toContain(
      'may be shown on the result page with their username, avatar and role; others are never shown',
    );
    expect(plain).toContain('counts of visits to pages that name your account');
    expect(plain).toContain("other people's results on them included");
    expect(plain).toContain('Learn data: until you delete it or remove your data');
    expect(plain).toContain('Ways into Contribute and Learn pages: six months');
  });

  it('says how long Contribute keeps what its fair-use checks find, and that deleting keeps it', () => {
    expect(plain).toContain(
      'What we find, the messages we send you about it and your answers are kept for up to 180 days after the last change, even after you delete your Contribute data, and longer while a shorter list or a block is in place.',
    );
    expect(plain).toContain(
      'and what our fair-use checks found, with the messages we sent you about it and your answers, as long as Fair use above says.',
    );
  });

  it('links the rule only where the Terms show it, the Terms’ top before that and in the static page', async () => {
    // The static page: the plain link, until the check answers.
    expect(plain).toContain('(see the Terms of service ). To check that');
    expect(html).toContain('href="/terms"');
    expect(html).not.toContain('href="/terms#contribute-rules"');

    contributeShown.mockResolvedValueOnce(false);
    expect(renderToStaticMarkup(await ShownTermsRulesLink())).toContain('href="/terms"');
    contributeShown.mockRejectedValueOnce(new Error('down'));
    expect(renderToStaticMarkup(await ShownTermsRulesLink())).toContain('href="/terms"');
    contributeShown.mockResolvedValueOnce(true);
    expect(renderToStaticMarkup(await ShownTermsRulesLink())).toContain('href="/terms#contribute-rules"');
  });

  it('keeps the anchors other pages link to', () => {
    for (const id of ['removal', 'contribute', 'visitors', 'cookies']) expect(html).toContain(`id="${id}"`);
  });
});
