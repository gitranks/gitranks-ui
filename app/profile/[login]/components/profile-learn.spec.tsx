import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));
vi.mock('@/app/learn/actions', () => ({ dismissLearnPromo: vi.fn(async () => ({ ok: true, data: true })) }));
const { reportLearnEvent } = vi.hoisted(() => ({ reportLearnEvent: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => ({ reportLearnEvent }));

const { ProfileLearnBlock } = await import('./profile-learn-block');
const { LearnRecordCard, ProfileLearnRecord } = await import('./profile-learn-record');
const { OwnerSuggestionView, ProfileContribute } = await import('./profile-contribute');
const { reportPromo } = await import('@/app/learn/components/use-promo-report');
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
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/issues/871"');
    expect(html).toContain('background-color:#3178c6');
    expect(html).toContain('href="/learn/profile"');
    expect(html).toContain('Not for me');
  });

  it('reads without issues', () => {
    const html = renderToStaticMarkup(<ProfileLearnBlock promo={{ ...profilePromo, issues: [] }} />);
    expect(html).not.toContain('data-issue=');
    expect(html).toContain('Your agent fixes a real issue');
  });

  it("takes the Contribute block's place when it may suit the owner, and gives it back otherwise", () => {
    const answer = {
      kind: 'contributor' as const,
      issues: [
        {
          repo: 'o/r',
          number: 1,
          url: 'https://github.com/o/r/issues/1',
          title: 'Fix 1',
          labels: [],
          language: null,
          kind: null,
          size: null,
          why: [],
          testCommand: false,
          fit: 'listed',
          repoLanguage: null,
        },
      ],
    };
    const learn = renderToStaticMarkup(<OwnerSuggestionView answer={answer} learn={profilePromo} />);
    expect(learn).toContain('data-learn-promo="profile"');
    expect(learn).not.toContain('data-contribute-block');
    const contribute = renderToStaticMarkup(<OwnerSuggestionView answer={answer} learn={null} />);
    expect(contribute).toContain('data-contribute-block="connected"');
    expect(contribute).not.toContain('data-learn-promo');
    expect(renderToStaticMarkup(<OwnerSuggestionView answer={{ kind: 'none' }} learn={null} />)).toBe('');
  });

  it("reports the owner's own profile as a profile, never by its login", () => {
    vi.stubGlobal('window', { location: { pathname: '/profile/octocat' } });
    reportPromo('promo_dismissed', 'learn_promo_profile');
    expect(reportLearnEvent).toHaveBeenLastCalledWith(
      { kind: 'learn_click', event: 'promo_dismissed', source: 'learn_promo_profile' },
      undefined,
      '/profile',
    );
    reportPromo('promo_clicked', 'learn_promo_signed_in');
    expect(reportLearnEvent).toHaveBeenLastCalledWith(
      { kind: 'learn_click', event: 'promo_clicked', source: 'learn_promo_signed_in' },
      undefined,
      '/profile/octocat',
    );
    vi.unstubAllGlobals();
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
