import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
// Learn's "Not for me" is a server action: nothing here calls it.
vi.mock('@/lib/learn/actions', () => ({ dismissLearnPromo: async () => ({ ok: true, data: true }) }));

const { ProfileContribute, ProfileContributeView, ownProfileBlockUrl } = await import('./profile-contribute');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

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

  it('draws a masked pick from the answer after the switch, its naming fields null, without failing', () => {
    const masked = { ...pick(1), repo: null, number: null, url: null, title: null, labels: null, why: null };
    const html = renderToStaticMarkup(
      <ProfileContributeView
        answer={{ kind: 'contributor', issues: [{ ...masked, masked: maskedIssue() }, pick(2, 'listed')] }}
      />,
    );
    expect(html).toContain('data-masked-row="q7k2m9xa"');
    expect(html).toContain('Fix 2');
  });

  it('puts nothing that names a masked pick in the page, whatever the answer carried beside its masked form', () => {
    const leaky = {
      ...pick(4242),
      repo: 'secret-org/secret-repo',
      title: 'Secret title of the real issue',
      why: ['secret reason'],
      masked: maskedIssue(),
    };
    const html = renderToStaticMarkup(<ProfileContributeView answer={{ kind: 'contributor', issues: [leaky] }} />);
    expect(html).toContain('data-masked-row="q7k2m9xa"');
    for (const secret of ['secret', '4242']) expect(html).not.toContain(secret);
  });

  it('shows nothing without an answer', () => {
    expect(renderToStaticMarkup(<ProfileContributeView answer={{ kind: 'none' }} />)).toBe('');
  });
});
