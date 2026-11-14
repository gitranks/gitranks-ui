import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));
vi.mock('@/app/learn/actions', () => ({ dismissLearnPromo: vi.fn(async () => ({ ok: true, data: true })) }));

const { ProfileLearnBlock } = await import('./profile-learn-block');
const { LearnRecordCard, ProfileLearnRecord } = await import('./profile-learn-record');
const { ProfileContribute } = await import('./profile-contribute');
const { learnRecord, profilePromo, promoColors } = await import('@/lib/learn/__fixtures__/promo');

describe("Learn suggested on the owner's own profile", () => {
  it('is framed as the owner\'s alone, with why, the issues, "Set my goal" and "Not for me"', () => {
    const html = renderToStaticMarkup(<ProfileLearnBlock promo={profilePromo} colors={promoColors} />);
    expect(html).toContain('GitRanks Learn · Only you see this');
    expect(html).toContain('data-contribute-source="learn_promo_profile"');
    expect(html).toContain('Learn TypeScript on real issues');
    expect(html).toContain('You started your first TypeScript repo 3 weeks ago. Your agent fixes one of these');
    expect(html.match(/data-issue=/g)).toHaveLength(3);
    expect(html).toContain('Lesson: cache keys and Map equality');
    expect(html).toContain('background-color:#3178c6');
    expect(html).toContain('href="/learn/profile"');
    expect(html).toContain('Not for me');
  });

  it('reads without issues', () => {
    const html = renderToStaticMarkup(<ProfileLearnBlock promo={{ ...profilePromo, issues: [] }} />);
    expect(html).not.toContain('data-issue=');
    expect(html).toContain('Your agent fixes a real issue');
  });

  it('renders nothing in the server HTML, so the cached page and the browser agree', () => {
    for (const githubLogin of [null, 'octocat', 'someone']) {
      useSession.mockReturnValue({ data: githubLogin ? { user: { githubLogin } } : null });
      expect(renderToStaticMarkup(<ProfileContribute login="octocat" />)).toBe('');
    }
  });
});

describe('the Learn record on a profile', () => {
  it('shows the numbers, five topics and the rest counted', () => {
    const html = renderToStaticMarkup(<LearnRecordCard record={learnRecord} />);
    expect(html).toContain('Learned on real issues');
    expect(html).toContain('lessons done');
    expect(html).toContain('topics learned');
    expect(html).toContain('pull requests opened');
    expect(html).toContain('+4 more');
    expect(html).not.toContain('All lessons');
  });

  it('gives the owner the way to their lessons', () => {
    expect(renderToStaticMarkup(<LearnRecordCard record={learnRecord} own />)).toContain('href="/learn/lessons"');
  });

  it('says one in the singular', () => {
    const html = renderToStaticMarkup(
      <LearnRecordCard record={{ lessons: 1, topics: ['Rounding'], prsOpened: 1, prsMerged: 0 }} />,
    );
    expect(html).toContain('lesson done');
    expect(html).toContain('topic learned');
    expect(html).toContain('pull request opened');
    expect(html).not.toContain('more');
  });

  it('is left out without a record, and before the browser reads it', () => {
    expect(renderToStaticMarkup(<LearnRecordCard record={null} own />)).toBe('');
    useSession.mockReturnValue({ data: null });
    expect(renderToStaticMarkup(<ProfileLearnRecord login="octocat" />)).toBe('');
  });
});
