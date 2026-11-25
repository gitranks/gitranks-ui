// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RealFixes, RealProjectsEnd, RealProjectsGroup, RealProjectsTop } from './real-projects';
import { learnFixes } from '@/lib/learn/__fixtures__/issues';
import { fixLanguageOf, passedFixes, tenOfMany } from '@/lib/learn/__fixtures__/real-projects';
import { learnLessonPath } from '@/lib/learn/paths';
import { FIXED_NONE, OPEN_NONE } from '@/lib/learn/real-projects';

const draw = (node: React.ReactElement) => {
  document.body.innerHTML = renderToStaticMarkup(node);
  return document.body;
};
/** What a person reads: each element's words apart, as the page lays them out. */
const text = (node: Element | null) =>
  node?.innerHTML
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

describe('a lesson in real projects', () => {
  it('heads the page with the way back, the title and the sentence', () => {
    const page = draw(<RealProjectsTop backHref={learnLessonPath('binary-search')} name="Binary search" />);
    expect(page.querySelector('a')?.getAttribute('href')).toBe('/learn/lessons/binary-search');
    expect(text(page.querySelector('a'))).toBe('← The lesson');
    expect(text(page.querySelector('h1'))).toBe('Binary search: in real projects');
    expect(text(page.querySelector('p'))).toBe(
      'Open issues in real open-source projects that this lesson helps you fix, and merged fixes that used it.',
    );
  });

  it('names a group over what it holds', () => {
    const page = draw(
      <RealProjectsGroup group="fixed">
        <RealProjectsEnd end={FIXED_NONE} kind="fixed-none" />
      </RealProjectsGroup>,
    );
    expect(text(page.querySelector('h2'))).toBe('Fixed');
    expect(text(page.querySelector('[data-real-projects-end]'))).toBe(
      'No fix yet When someone fixes a real issue with this lesson and the fix is merged, it shows here.',
    );
  });

  it("leaves room under the open group's end for what it offers", () => {
    const page = draw(
      <RealProjectsEnd end={OPEN_NONE} kind="open-none">
        <button type="button">Email me</button>
      </RealProjectsEnd>,
    );
    expect(text(page)).toBe('No open issue needs this lesson right now New issues come in every day. Email me');
  });

  it('draws a fix with its language, who fixed it, "Passed" where passed, the day it merged and "Open the fix"', () => {
    const page = draw(
      <RealFixes rows={learnFixes.rows.slice(0, 2)} total={2} passed={passedFixes} languageOf={fixLanguageOf} />,
    );
    const [first, second] = [...page.querySelectorAll('[data-real-fix]')];
    expect(first.querySelector('[data-fix-language]')?.textContent).toBe('Go');
    expect(text(first)).toContain('fixed by octocat');
    expect(first.querySelector('[data-fix-passed]')).not.toBeNull();
    expect(text(first)).toContain('merged 18 Nov');
    expect([...first.querySelectorAll('a')].map((link) => text(link))).toContain('Open the fix');
    expect(second.querySelector('[data-fix-passed]')).toBeNull();
    expect(page.querySelector('[data-fixes-count]')).toBeNull();
  });

  it('draws no "Passed" while the passed walkthroughs are not read, and no language when not known', () => {
    const page = draw(
      <RealFixes
        rows={[{ ...learnFixes.rows[0], repo: 'unknown/project' }]}
        total={1}
        passed={null}
        languageOf={fixLanguageOf}
      />,
    );
    expect(page.querySelector('[data-fix-passed]')).toBeNull();
    expect(page.querySelector('[data-fix-language]')).toBeNull();
  });

  it('counts the fixes only above ten, with "Show N more"', () => {
    const page = draw(
      <RealFixes rows={tenOfMany} total={23} passed={null} languageOf={fixLanguageOf} onMore={() => {}} />,
    );
    expect(page.querySelectorAll('[data-real-fix]')).toHaveLength(10);
    expect(text(page.querySelector('[data-fixes-count]'))).toBe('Showing 10 of 23 fixes Show 10 more');
  });
});
