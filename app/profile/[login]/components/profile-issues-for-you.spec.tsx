import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));

const { ProfileIssuesBlock, ProfileIssuesForYou } = await import('./profile-issues-for-you');
const { isProfileOwner, profileIssuesUrl } = await import('@/lib/contribute/profile-issues');

import type { ContributeIssue } from '@/lib/contribute/contribute.types';

const issue = (n: number): ContributeIssue => ({
  issueId: `I_${n}`,
  repositoryId: 'R_1',
  nameWithOwner: 'fern-lang/fern',
  number: 2500 + n,
  url: `https://github.com/fern-lang/fern/issues/${2500 + n}`,
  title: `Formatter issue ${n}`,
  labels: ['good first issue', 'formatter', 'parser'],
  language: 'RUST',
  kind: 'BUG',
  size: 'S',
  score: 0.9,
  rank: n,
  why: 'you write Rust',
});

describe('the profile block "Issues for you"', () => {
  it('renders nothing at all without issues', () => {
    expect(renderToStaticMarkup(<ProfileIssuesBlock issues={[]} />)).toBe('');
  });

  it('shows at most three compact cards, without Skip, and the way to the rest', () => {
    const html = renderToStaticMarkup(<ProfileIssuesBlock issues={[1, 2, 3, 4].map(issue)} />);

    expect(html.match(/data-issue=/g)).toHaveLength(3);
    expect(html).toContain('Issues for you');
    expect(html).toContain('Only you see this.');
    expect(html).toContain('href="/contribute/issues"');
    expect(html).toContain('fern-lang/fern · #2501');
    expect(html).toContain('href="https://github.com/fern-lang/fern/issues/2501"');
    expect(html).toContain('good first issue');
    expect(html).toContain('Rust');
    expect(html).not.toContain('Skip');
    expect(html).not.toContain('Why:');
  });

  it('renders nothing before the issues arrive, for the owner or anyone else', () => {
    for (const data of [null, { user: { githubLogin: 'octocat' } }, { user: { githubLogin: 'someone' } }]) {
      useSession.mockReturnValue({ data });
      expect(renderToStaticMarkup(<ProfileIssuesForYou login="octocat" />)).toBe('');
    }
  });
});

describe('who the block asks for', () => {
  it('is the signed-in owner alone, whatever the case of the login', () => {
    expect(isProfileOwner('octocat', 'octocat')).toBe(true);
    expect(isProfileOwner('OctoCat', 'octocat ')).toBe(true);
    expect(isProfileOwner('someone', 'octocat')).toBe(false);
    expect(isProfileOwner(undefined, 'octocat')).toBe(false);
    expect(isProfileOwner('octocat', null)).toBe(false);
    expect(isProfileOwner('', '')).toBe(false);
  });

  it("asks only on the owner's own profile, and nothing for a visitor or another login", () => {
    expect(profileIssuesUrl('octocat', 'octocat')).toBe('/api/me/contribute/issues?login=octocat');
    expect(profileIssuesUrl('OctoCat', 'octocat')).toBe('/api/me/contribute/issues?login=octocat');
    expect(profileIssuesUrl('someone', 'octocat')).toBeNull();
    expect(profileIssuesUrl(undefined, 'octocat')).toBeNull();
  });
});
