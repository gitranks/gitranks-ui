import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { session, useContributeAllowed } = vi.hoisted(() => ({
  session: { data: null as { user: { githubLogin?: string } } | null },
  useContributeAllowed: vi.fn<(login: string | null | undefined) => boolean | null>(),
}));

vi.mock('next-auth/react', () => ({ useSession: () => ({ data: session.data }) }));
vi.mock('@/lib/contribute/use-contribute-allowed', () => ({ useContributeAllowed }));

const { ContributeSection, ContributeSectionView, EXAMPLE_PICKS } = await import('./contribute-section');

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
  beforeEach(() => {
    session.data = { user: { githubLogin: 'octocat' } };
    useContributeAllowed.mockReset();
  });

  it("asks the header item's question about the signed-in user, and shows only on its yes", () => {
    useContributeAllowed.mockReturnValue(true);
    expect(renderToStaticMarkup(<ContributeSection />)).toContain('Invest in the open source you build on');
    expect(useContributeAllowed).toHaveBeenCalledWith('octocat');

    for (const answer of [null, false]) {
      useContributeAllowed.mockReturnValue(answer);
      expect(renderToStaticMarkup(<ContributeSection />)).toBe('');
    }
  });

  it('asks about nobody when signed out, and stays hidden', () => {
    session.data = null;
    useContributeAllowed.mockImplementation((login) => !!login);

    expect(renderToStaticMarkup(<ContributeSection />)).toBe('');
    expect(useContributeAllowed).toHaveBeenCalledWith(null);
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
    const html = renderToStaticMarkup(<ContributeSectionView viewer="member" picks={EXAMPLE_PICKS} />);

    expect(html).toContain('data-picks="example"');
    expect(html).toContain('Example picks</span> <span');
    expect(html).toContain('Why: Your stack: fern-fmt · used by 3 of 5 repos · A maintainer asked for a PR');
    expect(html).not.toContain('href="https://github.com/');
    expect(html).toContain('Fix it with');
    expect(html).toContain('>New<');
  });

  it("opens Contribute, where the header's item goes, with no sign-in of its own", () => {
    const html = renderToStaticMarkup(<ContributeSectionView viewer="member" picks={EXAMPLE_PICKS} />);

    expect(html).toMatch(/<a [^>]*href="\/contribute">Start contributing/);
    expect(html).not.toContain('<button');
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
