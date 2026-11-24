import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));
vi.mock('next-auth/react', () => ({ useSession }));
const { reportLearnEvent } = vi.hoisted(() => ({ reportLearnEvent: vi.fn() }));
vi.mock('@/components/contribute-click-tracker/contribute-click-tracker', () => ({ reportLearnEvent }));

const { LearnRecordCard, ProfileLearnRecord } = await import('./profile-learn-record');
const { learnRecord } = await import('@/lib/learn/__fixtures__/promo');

describe('the Learn record on a profile', () => {
  it('shows the numbers, five topics and the rest counted', () => {
    const html = renderToStaticMarkup(<LearnRecordCard record={learnRecord} />);
    expect(html).toContain('Learned on real issues');
    expect(html).toContain('lessons done');
    expect(html).toContain('topics learned');
    expect(html).toContain('pull requests opened');
    expect(html).toContain('+4 more');
    expect(html).not.toContain('Your progress');
    // The title opens the public progress page, for every reader.
    expect(html).toContain('href="/learn/progress/octocat"');
  });

  it('gives the owner the way to their progress', () => {
    const html = renderToStaticMarkup(<LearnRecordCard record={learnRecord} own />);
    expect(html).toContain('href="/learn/progress"');
    expect(html).toContain('Your progress →');
  });

  it('says one in the singular', () => {
    const html = renderToStaticMarkup(
      <LearnRecordCard
        record={{
          login: 'octocat',
          lessons: 1,
          newThings: 1,
          topics: ['Rounding'],
          prsOpened: 1,
          prsMerged: 0,
          reposHelped: 0,
        }}
      />,
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
