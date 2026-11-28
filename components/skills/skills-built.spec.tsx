// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SkillsBuiltSection } from './skills-built';
import { SkillsPageView } from './skills-page-view';
import {
  allThreePage,
  builderPage,
  builtKeyValue,
  builtMcpServer,
  builtWebServerGold,
  contributorPage,
  ownerBuildsMine,
  SKILLS_NOW,
} from '@/lib/skills/__fixtures__/skills';
import type { SkillsPage } from '@/lib/skills/skills.types';

const LONG_DASH = String.fromCodePoint(0x2014);

/** The markup in a document, to query. */
function draw(node: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(node);
  const text = root.textContent ?? '';
  expect(text).not.toContain(LONG_DASH);
  expect(text.toLowerCase()).not.toContain('claim');
  expect(text).not.toMatch(/(^|\D)0 /);
  return { root, text };
}

describe('the Built section', () => {
  it('sits between the fixes and the courses, with its heading and the line that names GitRanks Build', () => {
    const { root, text } = draw(<SkillsPageView page={allThreePage} now={SKILLS_NOW} />);
    const order = [...root.querySelectorAll('h3')].map((heading) => heading.textContent);
    expect(order).toEqual(['Fixes in real projects', 'Built', 'Courses']);
    expect(text).toContain('Made with GitRanks Build: an AI agent wrote each project one small step at a time');
    const link = [...root.querySelectorAll('[data-skills-built-section] a')].find(
      (a) => a.textContent === 'GitRanks Build',
    );
    expect(link?.getAttribute('href')).toBe('/build');
    expect(root.querySelectorAll('[data-skills-built]')).toHaveLength(2);
  });

  it('shows someone who only builds: the numbers, then Built, and nothing else', () => {
    const { root, text } = draw(<SkillsPageView page={builderPage} now={SKILLS_NOW} />);
    expect(root.querySelector('[data-skills-page="BUILDER"]')).not.toBeNull();
    expect([...root.querySelectorAll('h3')].map((heading) => heading.textContent)).toEqual(['Built']);
    expect(text).toContain('projects built');
    expect(text).toContain('1 repeated after a week');
    expect(text).toContain('with a step of a build');
    expect(text).toContain('Built with GitRanks Build since November 2026');
    expect(root.querySelectorAll('[data-skills-built]')).toHaveLength(3);
  });

  it('draws one row with its facts, the thing, its line, the marks gold first, the day and the project', () => {
    const { root, text } = draw(<SkillsBuiltSection built={[builtMcpServer]} login="octocat" now={SKILLS_NOW} />);
    const row = root.querySelector('[data-skills-built="mcp-server"]') as HTMLElement;
    expect(row.textContent).toContain('TypeScript16 steps2 of 5 optional parts');
    expect(text).toContain('An MCP server');
    expect([...row.querySelectorAll('[data-built-mark]')].map((mark) => mark.getAttribute('data-built-mark'))).toEqual([
      'gold',
      'answered',
    ]);
    expect(text).toContain('Repeated after a week');
    expect(text).toContain('Answered every step');
    expect(text).toContain('built 20 Nov');
    expect([...row.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['An MCP server', '/build/mcp-server'],
      ['The project', '/build/mcp-server'],
    ]);
  });

  it('draws a project built in both languages as one row with no mark, and gold alone', () => {
    const { root } = draw(
      <SkillsBuiltSection built={[builtWebServerGold, builtKeyValue]} login="octocat" now={SKILLS_NOW} />,
    );
    const both = root.querySelector('[data-skills-built="key-value-database"]') as HTMLElement;
    expect(both.textContent).toContain('TypeScript and Python');
    expect(both.querySelectorAll('[data-built-mark]')).toHaveLength(0);
    const gold = root.querySelector('[data-skills-built="web-server"]') as HTMLElement;
    expect([...gold.querySelectorAll('[data-built-mark]')].map((mark) => mark.getAttribute('data-built-mark'))).toEqual(
      ['gold'],
    );
  });

  it('is not there without a built project, nor for a page kept from before the API sent the rows', () => {
    expect(renderToStaticMarkup(<SkillsBuiltSection built={[]} login="octocat" now={SKILLS_NOW} />)).toBe('');
    expect(renderToStaticMarkup(<SkillsBuiltSection built={undefined} login="octocat" now={SKILLS_NOW} />)).toBe('');
    const { built: _built, ...before } = contributorPage;
    const html = renderToStaticMarkup(<SkillsPageView page={before as SkillsPage} now={SKILLS_NOW} />);
    expect(html).not.toContain('Built');
  });

  it("draws the owner's own view of their page with their built projects", () => {
    const page = ownerBuildsMine.page as SkillsPage;
    const { root } = draw(<SkillsPageView page={page} now={SKILLS_NOW} />);
    expect(root.querySelectorAll('[data-skills-built]')).toHaveLength(1);
    expect(root.querySelector('[data-skills-built-only-you]')).toBeNull();
  });

  it('says so when only its owner sees it, until Build is open to everyone', () => {
    const page = ownerBuildsMine.page as SkillsPage;
    const { root } = draw(<SkillsPageView page={page} now={SKILLS_NOW} builtOnlyYou />);
    expect(root.querySelector('[data-skills-built-only-you]')?.textContent).toBe(
      'Only you see this section until Build is open to everyone.',
    );
  });
});
