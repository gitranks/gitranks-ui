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

  it('has a GitRanks Learn section, linked from the contents', () => {
    expect(html).toContain('id="learn"');
    expect(html).toContain('href="#learn"');
  });

  it('is dated 24 November 2026', () => {
    expect(plain).toContain('Last updated 24 November 2026');
    expect(html).toContain('dateTime="2026-11-24"');
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
      'What our earlier checks found is kept for up to 180 days after its last change. Basis: legitimate interests, in keeping Contribute fair.',
    );
    expect(plain).toContain(
      'and what our fair-use checks found, with the messages we sent you about it and your answers, as long as Fair use above says.',
    );
  });

  it('links the rule only where the Terms show it, the Terms’ top before that and in the static page', async () => {
    // The static page: the plain link, until the check answers.
    expect(plain).toContain('(see the Terms of service ). Once a day we compare');
    expect(html).toContain('href="/terms"');
    expect(html).not.toContain('href="/terms#contribute-rules"');

    contributeShown.mockResolvedValueOnce(false);
    expect(renderToStaticMarkup(await ShownTermsRulesLink())).toContain('href="/terms"');
    contributeShown.mockRejectedValueOnce(new Error('down'));
    expect(renderToStaticMarkup(await ShownTermsRulesLink())).toContain('href="/terms"');
    contributeShown.mockResolvedValueOnce(true);
    expect(renderToStaticMarkup(await ShownTermsRulesLink())).toContain('href="/terms#contribute-rules"');
  });

  it('says what the record of issues taken holds, why, and that it stays without the name after a delete', () => {
    expect(plain).toContain(
      'Issues you take : we keep a record of every request to take an issue, granted or refused: when you see one in full on GitRanks, when your agent takes one, when you start one, or when the hosted agent picks one for you.',
    );
    expect(plain).toContain(
      'We keep it for as long as GitRanks runs Contribute; when you delete your Contribute data, it stays without your username and account id.',
    );
    expect(plain).toContain('The record of the issues you asked to take stays, without your username and account id.');
    expect(plain).toContain('the record of the issues you asked to take, without your username and account id;');
    expect(plain).toContain(
      'Seeing an issue in full : when you press "See the full issue" before you sign in, one cookie, for 10 minutes, carries the press through the GitHub sign-in, so the issue shows in full when you return.',
    );
  });

  it('says how the rules about full issues a day count and keep', () => {
    expect(plain).toContain(
      'Once a day we compare the issues you took with the pull requests you open, on GitRanks or outside it, and count the issues you took against the pull requests you opened through GitRanks.',
    );
    expect(plain).toContain(
      'We keep them for as long as GitRanks runs Contribute, even after you delete your Contribute data, so that deleting resets nothing.',
    );
    expect(plain).toContain('a lower limit or a closed access, and your requests to look again.');
    expect(plain).toContain(
      'Messages and your answers: 180 days after they were sent, longer while a lower limit or a closed access holds.',
    );
    expect(plain).not.toContain('the messages we send you about them');
    expect(plain).not.toContain('count the issues you view');
    expect(plain).not.toContain('a shorter list');
  });

  it('names the cookie that keeps the bar seen last, what it holds and how long it lasts', () => {
    expect(plain).toContain(
      "Preferences : one cookie, gr_last_bar, that keeps which bar you saw last, Learn's or Contribute's, so Settings opens with the same one. It lasts a year and is renewed on each page that shows either bar.",
    );
  });

  it('keeps the anchors other pages link to', () => {
    for (const id of ['removal', 'contribute', 'visitors', 'cookies']) expect(html).toContain(`id="${id}"`);
  });
});
