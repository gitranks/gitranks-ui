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

import { LearnHomeView } from './learn-home-view';
import { HOME_NOW, homeDay, homeNewLearner, homeSetup } from '@/lib/learn/__fixtures__/learn-home-page';
import { homeRealIssues } from '@/lib/learn/__fixtures__/real-issues';
import type { LearnHomeRead } from '@/lib/learn/home';

/*
 * Learn home without Interviews' row, as a learner gets it while Interviews is closed to them: the stored markup was
 * drawn by the page before Interviews joined it, so any change to today's page shows here.
 */

// The rows of real issues ask the browser about its pointer.
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
})) as unknown as typeof window.matchMedia;

const HOMES: [string, LearnHomeRead][] = [
  ['a day with lessons due', homeDay],
  ['a new learner', homeNewLearner],
];

const markupOf = (home: LearnHomeRead) =>
  renderToStaticMarkup(
    <LearnHomeView home={home} setup={homeSetup} now={HOME_NOW} timeZone={null} hints real={homeRealIssues} />,
  );

describe("Learn home without Interviews' row", () => {
  it("is today's page", async () => {
    const pages = HOMES.map(([name, home]) => `<!-- ${name} -->\n${markupOf(home)}\n`);
    await expect(pages.join('\n')).toMatchFileSnapshot('./__snapshots__/learn-home-view-today.html');
  });
});
