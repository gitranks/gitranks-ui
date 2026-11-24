// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LearnEntityCard } from './learn-entity-card';
import { entityCards, orgEntity, repoEntity } from '@/lib/learn/__fixtures__/entity-card';
import type { LearnEntity, LearnEntityCard as LearnEntityCardData } from '@/lib/learn/entity-card';

// The pages the rows lead to, built or not: each case below sets them.
const built = vi.hoisted(() => ({ issues: true, projectCourse: true }));
vi.mock('@/lib/learn/built-pages', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  get LEARN_ISSUES_PAGE_BUILT() {
    return built.issues;
  },
  get LEARN_PROJECT_COURSE_PAGE_BUILT() {
    return built.projectCourse;
  },
}));

beforeEach(() => {
  built.issues = true;
  built.projectCourse = true;
});

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(card: LearnEntityCardData | null, entity: LearnEntity) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<LearnEntityCard card={card} entity={entity} />);
  const text = root.textContent ?? '';
  expect(text).not.toContain(LONG_DASH);
  expect(text.toLowerCase()).not.toContain('claim');
  const rows = [...root.querySelectorAll('[data-entity-row]')].map((one) => one.getAttribute('data-entity-row'));
  return { root, text, rows };
}

describe('LearnEntityCard', () => {
  it('draws a repository’s course, fixes and open issues, each row a link', () => {
    const { root, text, rows } = draw(entityCards.repoEverything, repoEntity);
    expect(text).toContain('Learn from this project');
    expect(text).toContain('With GitRanks Learn: how this project works inside');
    expect(rows).toEqual(['course:nebula-ui', 'fixes', 'issues']);
    expect(text).toContain('A course about nebula/ui · 38 lessons');
    expect(text).toContain('7 fixes to learn from');
    expect(text).toContain('See the fixes →');
    expect(root.querySelector('[data-entity-row="fixes"]')?.getAttribute('href')).toBe(
      '/learn/issues?repo=nebula/ui&fixed=1',
    );
  });

  it('draws the other repository states', () => {
    expect(draw(entityCards.repoNoCourse, repoEntity).rows).toEqual(['fixes', 'issues']);
    expect(draw(entityCards.repoOneFix, repoEntity).text).toContain('1 fix to learn from');
    expect(draw(entityCards.repoNewCourse, repoEntity).text).toContain('1 open issue to fix');
  });

  it('draws no card with nothing behind it, nor for open issues alone', () => {
    expect(renderToStaticMarkup(<LearnEntityCard card={entityCards.repoIssuesOnly} entity={repoEntity} />)).toBe('');
    expect(renderToStaticMarkup(<LearnEntityCard card={null} entity={repoEntity} />)).toBe('');
  });

  it('draws no row to a page that is not built, and no card with none left', () => {
    built.issues = false;
    built.projectCourse = false;
    expect(renderToStaticMarkup(<LearnEntityCard card={entityCards.repoEverything} entity={repoEntity} />)).toBe('');
    const many = draw(entityCards.orgManyRepos, orgEntity);
    expect(many.rows).toEqual(['repo-courses']);
    expect(many.root.innerHTML).not.toContain('/learn/issues');
    expect(many.root.innerHTML).not.toContain('/learn/repos/');
  });

  it('draws an org’s card', () => {
    const one = draw(entityCards.orgEverything, orgEntity);
    expect(one.text).toContain('Learn from this org’s projects');
    expect(one.rows).toEqual(['course:nebula', 'course:nebula-ui', 'fixes', 'issues']);
    const many = draw(entityCards.orgManyRepos, orgEntity);
    expect(many.text).toContain('Courses about 4 of its repositories');
  });
});
