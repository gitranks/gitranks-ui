import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null, status: 'unauthenticated' }) }));

const { ContributeSection, ContributeSectionView, contributeSectionShown, EXAMPLE_PICKS } = await import(
  './contribute-section'
);

const own = {
  ...EXAMPLE_PICKS[0],
  issueId: 'I_own',
  nameWithOwner: 'acme/widgets',
  number: 7,
  url: 'https://github.com/acme/widgets/issues/7',
  title: 'Crash on empty config',
  why: 'You write Go',
};

describe('the Contribute section on the home page', () => {
  it('shows a visitor the section once Contribute is open to everyone', () => {
    expect(contributeSectionShown(true, false, false)).toBe(true);
    expect(contributeSectionShown(false, false, false)).toBe(false);
  });

  it("follows a signed-in user's own access, so the button never leads to a page they cannot open", () => {
    expect(contributeSectionShown(false, true, true)).toBe(true);
    expect(contributeSectionShown(true, true, false)).toBe(false);
    expect(contributeSectionShown(false, true, false)).toBe(false);
    // Until their access is known: as for everyone.
    expect(contributeSectionShown(true, true, null)).toBe(true);
    expect(contributeSectionShown(false, true, null)).toBe(false);
  });

  it('keeps the button waiting, doing nothing, until the session and access are known', () => {
    const html = renderToStaticMarkup(<ContributeSectionView viewer="visitor" picks={EXAMPLE_PICKS} pending />);

    expect(html).toMatch(/<span aria-disabled="true" data-pending="true"[^>]*>Start contributing/);
    expect(html).not.toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('href="/contribute"');
  });

  it('renders nothing for a visitor before Contribute is open, and the section once it is', () => {
    expect(renderToStaticMarkup(<ContributeSection open={false} />)).toBe('');
    expect(renderToStaticMarkup(<ContributeSection open />)).toContain('Invest in the open source you build on');
  });

  it('leads with the investment, the stack and the track record; the rank comes last', () => {
    const html = renderToStaticMarkup(<ContributeSectionView viewer="member" picks={EXAMPLE_PICKS} />);

    expect(html).toContain('<h2 id="contribute"');
    for (const title of [
      'Help the projects you depend on',
      'Your agent writes it, you approve it',
      'A track record that works for you',
    ]) {
      expect(html).toContain(title);
    }
    expect(html.indexOf('can count toward your Contributor rank')).toBeGreaterThan(html.indexOf('next job search'));
    expect(html).toContain('Every pull request says it was made with AI.');
  });

  it('marks the examples as examples, with no links to made-up issues', () => {
    const html = renderToStaticMarkup(<ContributeSectionView viewer="visitor" picks={EXAMPLE_PICKS} />);

    expect(html).toContain('data-picks="example"');
    expect(html).toContain('Example picks</span> <span');
    expect(html).not.toContain('These repos');
    expect(html).toContain('Why: Your stack: fern-fmt · used by 3 of 5 repos · A maintainer asked for a PR');
    expect(html).not.toContain('href="https://github.com/');
    expect(html).toContain('Fix it with');
  });

  it('asks a visitor to sign in first, and sends a signed-in user to Contribute', () => {
    const visitor = renderToStaticMarkup(<ContributeSectionView viewer="visitor" picks={EXAMPLE_PICKS} />);
    const member = renderToStaticMarkup(<ContributeSectionView viewer="member" picks={EXAMPLE_PICKS} />);

    expect(visitor).toMatch(/<button type="button"[^>]*aria-haspopup="dialog"[^>]*>Start contributing/);
    expect(visitor).not.toContain('href="/contribute"');
    expect(member).toMatch(/<a [^>]*href="\/contribute">Start contributing/);
    expect(visitor).toContain('>New<');
  });

  it('shows a contributor their own picks, linked, with the way to Issues and to Contribute', () => {
    const html = renderToStaticMarkup(<ContributeSectionView viewer="contributor" picks={[own]} />);

    expect(html).toContain('data-picks="own"');
    expect(html).toContain('Up next for you');
    expect(html).toContain('href="https://github.com/acme/widgets/issues/7"');
    expect(html).toContain('href="/contribute/issues"');
    expect(html).toMatch(/<a [^>]*href="\/contribute">Open Contribute/);
    expect(html).not.toContain('Example picks');
    expect(html).not.toContain('Fix it with');
    expect(html).not.toContain('>New<');
  });
});
