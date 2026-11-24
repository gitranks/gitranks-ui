// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SkillsPageView } from './skills-page-view';
import { SkillsStrip } from './skills-strip';
import { bothPage, contributorPage, learnerPage, longPage, skillsMine } from '@/lib/skills/__fixtures__/skills';
import { otherBoxOf } from '@/lib/skills/skills-owner';

const LONG_DASH = String.fromCodePoint(0x2014);

/** The markup in a document, to query. */
function draw(node: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(node);
  const text = root.textContent ?? '';
  expect(text).not.toContain(LONG_DASH);
  expect(text.toLowerCase()).not.toContain('claim');
  return { root, text, hrefs: [...root.querySelectorAll('a')].map((a) => a.getAttribute('href')) };
}

describe('SkillsPageView', () => {
  it('draws a contributor: the numbers, the line, the fixes and no courses', () => {
    const { root, text } = draw(<SkillsPageView page={contributorPage} />);
    expect(root.querySelector('[data-skills-page="CONTRIBUTOR"]')).not.toBeNull();
    expect(text).toContain('fixes merged');
    expect(text).toContain('With GitRanks Contribute since June 2026: fixes in Go, Python and TypeScript');
    expect(text).toContain('Fixes in real projects');
    expect(root.querySelectorAll('[data-skills-fix]')).toHaveLength(6);
    expect(text).not.toContain('Courses');
    expect(text).not.toContain('Show 20 more');
  });

  it('offers "Show 20 more" only when it can ask for more', () => {
    expect(draw(<SkillsPageView page={longPage} onMore={() => {}} />).text).toContain('Show 20 more');
    expect(draw(<SkillsPageView page={longPage} />).text).not.toContain('Show 20 more');
  });

  it('draws a learner: their fixes made with Learn, and the courses with their squares', () => {
    const { root, text } = draw(<SkillsPageView page={learnerPage} />);
    expect(text).toContain('Learned on GitRanks Learn since June 2026');
    expect(text).toContain('answered questions about it before it was sent');
    expect(text).toContain('Courses');
    expect(text).toContain('Algorithms and data structures');
    expect(root.querySelectorAll('[data-skills-course]')).toHaveLength(3);
  });

  it('draws someone of both, each fix saying which product made it', () => {
    const { text } = draw(<SkillsPageView page={bothPage} />);
    expect(text).toContain('Made with GitRanks Contribute or GitRanks Learn');
    expect(text).toContain('with Learn');
    expect(text).toContain('with Contribute');
  });

  it('draws the owner’s page with its strip and the box about the other product', () => {
    const mine = skillsMine.publicFirstFix;
    const { root, text } = draw(
      <SkillsPageView
        page={mine.page ?? contributorPage}
        strip={<SkillsStrip mine={mine} href="https://gitranks.com/profile/octocat/skills" />}
        other={otherBoxOf(mine)}
      />,
    );
    expect(text).toContain('Everyone can see this page.');
    expect(root.querySelector('[data-product-box="LEARN"]')).not.toBeNull();
    expect(text).toContain('Only you see this');
  });

  it('leaves Learn’s links out while Learn is not open to the reader', () => {
    const { hrefs } = draw(<SkillsPageView page={learnerPage} learnOpen={false} />);
    expect(hrefs.some((href) => href?.startsWith('/learn/fixes/'))).toBe(false);
    expect(hrefs.some((href) => href?.startsWith('/learn/lessons/'))).toBe(true);
  });
});
