import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));

const { ProfileContribute, ProfileContributeView, ownProfileBlockUrl } = await import('./profile-contribute');

const pick = (n: number, fit = 'language') => ({
  repo: `o/r${n}`,
  number: n,
  url: `https://github.com/o/r${n}/issues/${n}`,
  title: `Fix ${n}`,
  labels: [],
  language: 'js-ts',
  kind: 'bug',
  size: 'S',
  why: ['A maintainer asked for this change'],
  testCommand: false,
  fit,
  repoLanguage: { name: 'TypeScript', color: '#3178c6' },
});

describe("the owner's Contribute block, chosen in the browser", () => {
  it('renders nothing in the server HTML, for the owner or anyone else, so the cached page and the browser agree', () => {
    for (const githubLogin of [null, 'octocat', 'someone']) {
      useSession.mockReturnValue({ data: githubLogin ? { user: { githubLogin } } : null });
      expect(renderToStaticMarkup(<ProfileContribute login="octocat" />)).toBe('');
    }
  });

  it("asks only on the owner's own profile: nothing for a visitor, signed in or out", () => {
    expect(ownProfileBlockUrl('OctoCat', 'octocat ')).toBe('/api/me/contribute/profile-block?login=octocat');
    expect(ownProfileBlockUrl('someone', 'octocat')).toBeNull();
    expect(ownProfileBlockUrl(undefined, 'octocat')).toBeNull();
  });

  it('shows the owner their picks before they connect, matched to their languages', () => {
    const html = renderToStaticMarkup(
      <ProfileContributeView
        answer={{
          kind: 'own',
          issues: [1, 2, 3].map((n) => pick(n)),
          stats: { screenedRepos: 1, issuesRead: 2, readyIssues: 3105 },
        }}
      />,
    );
    expect(html).toContain('Connect my agent');
    expect(html).toContain('Picked for your TypeScript from');
    expect(html).toContain('3,105');
  });

  it("shows a contributor their own list's top", () => {
    const html = renderToStaticMarkup(
      <ProfileContributeView answer={{ kind: 'contributor', issues: [1, 2, 3].map((n) => pick(n, 'listed')) }} />,
    );
    expect(html).toContain('All my issues');
    expect(html.match(/data-issue=/g)).toHaveLength(3);
  });

  it('shows nothing without an answer', () => {
    expect(renderToStaticMarkup(<ProfileContributeView answer={{ kind: 'none' }} />)).toBe('');
  });
});
