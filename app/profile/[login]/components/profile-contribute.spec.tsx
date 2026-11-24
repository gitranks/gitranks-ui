import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { OwnProfileBlockAnswer } from '@/lib/contribute/profile-picks';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));

const { OwnerBoxView, ProfileContributeView, ownProfileBlockUrl } = await import('./profile-contribute');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

const pick = (n: number, fit = 'language', language = { name: 'TypeScript', color: '#3178c6' }) => ({
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
  repoLanguage: language,
});

const own: Extract<OwnProfileBlockAnswer, { kind: 'own' }> = {
  kind: 'own',
  issues: [
    pick(1),
    pick(2, 'language', { name: 'Rust', color: '#dea584' }),
    pick(3, 'language', { name: 'Go', color: '#00add8' }),
  ],
  stats: { screenedRepos: 1, issuesRead: 2, readyIssues: 2500 },
};
const contributor = { kind: 'contributor' as const, issues: [1, 2, 3].map((n) => pick(n, 'listed')) };
const sides = (usesContribute: boolean, usesLearn: boolean, learnOpen = true) => ({
  usesContribute,
  usesLearn,
  learnOpen,
});
const skills = (patch: Partial<{ sides: ReturnType<typeof sides> | null; learnRows: unknown[] | null }> = {}) => ({
  sides: null,
  block: null,
  learnRows: null,
  ...patch,
});
const box = (picks: OwnProfileBlockAnswer, answer: ReturnType<typeof skills>) =>
  renderToStaticMarkup(
    <OwnerBoxView reads={{ picks, skills: answer as Parameters<typeof OwnerBoxView>[0]['reads']['skills'] }} />,
  ).replaceAll('<!-- -->', '');

describe("the owner's box on their own profile", () => {
  it("asks only on the owner's own profile: nothing for a visitor, signed in or out", () => {
    expect(ownProfileBlockUrl('OctoCat', 'octocat ')).toBe('/api/me/contribute/profile-block?login=octocat');
    expect(ownProfileBlockUrl('someone', 'octocat')).toBeNull();
    expect(ownProfileBlockUrl(undefined, 'octocat')).toBeNull();
  });

  it('picks issues for someone who uses neither product, with a way into each', () => {
    const html = box(own, skills({ sides: sides(false, false) }));
    expect(html).toContain('data-owner-box="picked"');
    expect(html).toContain('Only you see this');
    expect(html).toContain('Issues picked for you');
    expect(html).toMatch(
      /Picked for your TypeScript, Rust and Go from <span[^>]*>2,500<\/span> open-source issues ready to fix today\. Fix one with your AI agent, or learn from one\./,
    );
    expect(html).toContain('href="/contribute/about"');
    expect(html).toContain('See GitRanks Contribute');
    expect(html).toContain('href="/learn"');
    expect(html).toContain('See GitRanks Learn');
    expect(html.match(/data-issue=/g)).toHaveLength(3);
  });

  it('names nothing of Learn to someone it is not open to', () => {
    const html = box(own, skills({ sides: sides(false, false, false) }));
    expect(html).toContain('Fix one with your AI agent.');
    expect(html).not.toContain('learn from one');
    expect(html).not.toContain('See GitRanks Learn');
    expect(html).not.toContain('href="/learn"');
  });

  it('shows no zero: the ready issues are left out when there are none or they are not known', () => {
    for (const stats of [null, { screenedRepos: 0, issuesRead: 0, readyIssues: 0 }]) {
      const html = box({ ...own, stats }, skills({ sides: sides(false, false) }));
      expect(html).toContain('Picked for your TypeScript, Rust and Go from open-source issues ready to fix today.');
    }
  });

  it('gives a learner the top of their own list, masked, with the way to all of it', () => {
    const rows = [
      maskedIssue(),
      maskedIssue({ id: 'r3n8p1vd' }),
      maskedIssue({ id: 't5w0c4hy' }),
      maskedIssue({ id: 'x' }),
    ];
    const html = box(
      own,
      skills({ sides: sides(false, true), learnRows: rows.map((masked) => ({ kind: 'masked', masked })) }),
    );
    expect(html).toContain('data-owner-box="learn"');
    expect(html).toContain('GitRanks Learn · Only you see this');
    expect(html).toContain('Issues for you to learn on');
    expect(html).toContain(
      'From your own list, best first. Your agent fixes one, and its walkthrough teaches you the change.',
    );
    expect(html).toContain('href="/learn/issues"');
    expect(html).toContain('All my issues');
    expect(html.match(/data-masked-row=/g)).toHaveLength(3);
    expect(html).toContain('See the full issue');
    // Not a word of the picks.
    expect(html).not.toContain('Fix 1');
  });

  it("names a learner's row only for a project they named", () => {
    const named = {
      kind: 'named',
      repo: 'acme/notebook',
      number: 1290,
      url: 'https://github.com/acme/notebook/issues/1290',
      title: 'Duplicate tags appear in the sidebar after a rename',
      language: 'TypeScript',
    };
    const html = box({ kind: 'none' }, skills({ sides: sides(false, true), learnRows: [named] }));
    expect(html).toContain('href="https://github.com/acme/notebook/issues/1290"');
    expect(html).toContain('Duplicate tags appear in the sidebar after a rename');
  });

  it('is left out for a learner whose list is empty or cannot be read', () => {
    expect(box(own, skills({ sides: sides(false, true), learnRows: [] }))).toBe('');
    expect(box(own, skills({ sides: sides(false, true), learnRows: null }))).toBe('');
  });

  it("keeps Contribute's own box for someone who contributes or uses both, and when the sides cannot be read", () => {
    for (const answer of [skills({ sides: sides(true, false) }), skills({ sides: sides(true, true) }), skills()]) {
      const html = box(contributor, answer);
      expect(html).toContain('data-contribute-block="connected"');
      expect(html).toContain('Issues for you to fix');
      expect(html).not.toContain('data-owner-box');
    }
    expect(box(own, skills())).toContain('Connect my agent');
  });

  it('is left out without picks', () => {
    expect(box({ kind: 'none' }, skills({ sides: sides(false, false) }))).toBe('');
    expect(box({ kind: 'none' }, skills())).toBe('');
  });
});

describe("Contribute's own box", () => {
  it('shows the owner their picks before they connect, matched to their languages', () => {
    const html = renderToStaticMarkup(
      <ProfileContributeView answer={{ ...own, issues: [1, 2, 3].map((n) => pick(n)) }} />,
    );
    expect(html).toContain('Connect my agent');
    expect(html).toContain('Picked for your TypeScript from');
    expect(html).toContain('2,500');
  });

  it("shows a contributor their own list's top", () => {
    const html = renderToStaticMarkup(<ProfileContributeView answer={contributor} />);
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
