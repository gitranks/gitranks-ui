// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn',
}));
vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn(), readMoreLearnFixes: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

import { LearnHomeView, type LearnHomeViewProps } from './learn-home-view';
import { myHomeNone, myHomeOne, myHomeTwo } from '@/lib/interviews/__fixtures__/mine';
import { HOME_NOW, homeDay, homeNewLearner, homeSetup } from '@/lib/learn/__fixtures__/learn-home-page';
import { homeRealIssues } from '@/lib/learn/__fixtures__/real-issues';

/* Learn home with the row of the plan to go on with, as it is served once Interviews is open to everyone. */

// The rows of real issues ask the browser about its pointer.
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;

const markupOf = (props: Partial<LearnHomeViewProps> = {}) =>
  renderToStaticMarkup(
    <LearnHomeView
      home={homeDay}
      setup={homeSetup}
      now={HOME_NOW}
      timeZone={null}
      hints
      real={homeRealIssues}
      {...props}
    />,
  );
const pageOf = (props: Partial<LearnHomeViewProps> = {}) => {
  const page = document.createElement('div');
  page.innerHTML = markupOf(props);
  return page.querySelector('main')!;
};

describe("Learn home with the person's plans", () => {
  it('puts the row first, close above the three boxes', () => {
    const main = pageOf({ plans: myHomeOne });
    const row = main.firstElementChild!;
    expect(row.hasAttribute('data-plan-row')).toBe(true);
    expect(row.className).toContain('-mb-6');
    expect(row.nextElementSibling!.tagName).toBe('H1');
    expect(main.querySelector('[data-home-boxes]')!.previousElementSibling).toBe(row.nextElementSibling);
  });

  it('keeps the light on the lesson or review box: the row holds no button and is never lit', () => {
    const main = pageOf({ plans: myHomeTwo });
    const row = main.querySelector('[data-plan-row]')!;
    expect(row.querySelector('button, [data-lit], [data-course-enter]')).toBeNull();
    expect(main.querySelectorAll('[data-course-enter]')).toHaveLength(
      pageOf().querySelectorAll('[data-course-enter]').length,
    );
  });

  it('is above the first course for a new learner too', () => {
    const main = pageOf({ home: homeNewLearner, plans: myHomeOne });
    expect(main.firstElementChild!.hasAttribute('data-plan-row')).toBe(true);
  });

  it("leaves today's page as it is with no plan to go on with", () => {
    for (const home of [homeDay, homeNewLearner]) {
      expect(markupOf({ home, plans: myHomeNone })).toBe(markupOf({ home }));
      expect(markupOf({ home, plans: null })).toBe(markupOf({ home }));
    }
  });
});
