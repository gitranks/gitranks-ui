import { describe, expect, it } from 'vitest';

import { entityCards, orgEntity, repoEntity } from './__fixtures__/entity-card';
import { entityHeadOf, entityNumberOf, entityRowsOf } from './entity-card';

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);
const titleOf = (title: (string | number)[]) => title.join('');

describe('entityHeadOf', () => {
  it('names a repository and an org', () => {
    expect(entityHeadOf(repoEntity).title).toBe('Learn from this project');
    expect(entityHeadOf(orgEntity).title).toBe('Learn from this org’s projects');
  });
});

describe('entityRowsOf on a repository', () => {
  it('gives the course, the fixes and the open issues, in order', () => {
    const rows = entityRowsOf(entityCards.repoEverything, repoEntity);
    expect(ids(rows)).toEqual(['course:nebula-ui', 'fixes', 'issues']);
    expect(titleOf(rows[0].title)).toBe('A course about nebula/ui · 38 lessons');
    expect(rows[0]).toMatchObject({ action: 'Open the course', href: '/learn/repos/nebula/ui' });
    expect(rows[1]).toMatchObject({
      title: [7, ' fixes to learn from'],
      action: 'See the fixes',
      href: '/learn/issues?repo=nebula/ui&fixed=1',
    });
    expect(rows[1].text).toMatch(/^Issues fixed here through GitRanks\./);
    expect(rows[2]).toMatchObject({ title: [9, ' open issues to fix'], href: '/learn/issues?repo=nebula/ui' });
  });

  it('words one fix and one issue in the singular', () => {
    const fix = entityRowsOf(entityCards.repoOneFix, repoEntity);
    expect(ids(fix)).toEqual(['fixes']);
    expect(fix[0]).toMatchObject({ title: [1, ' fix to learn from'], action: 'See the fix' });
    expect(fix[0].text).toMatch(/^An issue fixed here through GitRanks\. It has a few questions/);
    const issue = entityRowsOf(entityCards.repoNewCourse, repoEntity);
    expect(ids(issue)).toEqual(['course:nebula-ui', 'issues']);
    expect(issue[1]).toMatchObject({ title: [1, ' open issue to fix'], action: 'See the issue' });
  });

  it('makes no card from open issues alone, nor from nothing', () => {
    expect(entityRowsOf(entityCards.repoIssuesOnly, repoEntity)).toEqual([]);
    expect(entityRowsOf(null, repoEntity)).toEqual([]);
    expect(entityRowsOf({ course: null, repoCourses: [], fixes: 0, openIssues: 0 }, repoEntity)).toEqual([]);
  });
});

describe('a course about a repository that names no repository', () => {
  it('makes no row, rather than a link by its name', () => {
    const nameless = { slug: 'x', name: 'Nebula UI', lessons: 4, repo: null, org: null };
    expect(entityRowsOf({ ...entityCards.repoEverything, course: nameless }, repoEntity).map((row) => row.id)).toEqual([
      'fixes',
      'issues',
    ]);
    expect(
      entityRowsOf({ ...entityCards.orgEverything, repoCourses: [nameless] }, orgEntity).map((row) => row.id),
    ).toEqual(['course:nebula', 'fixes', 'issues']);
  });
});

describe('entityRowsOf on an org', () => {
  it('gives the org’s course, a row for each of up to two repository courses, then fixes and issues', () => {
    const rows = entityRowsOf(entityCards.orgEverything, orgEntity);
    expect(ids(rows)).toEqual(['course:nebula', 'course:nebula-ui', 'fixes', 'issues']);
    expect(titleOf(rows[0].title)).toBe('A course about Nebula · 42 lessons');
    expect(rows[0].href).toBe('/learn/orgs/nebula');
    expect(rows[1].text).toBe('One of Nebula’s repositories.');
    expect(rows[2].text).toMatch(/^Issues fixed in Nebula’s repositories through GitRanks\./);
    expect(rows[2].href).toBe('/learn/issues?org=nebula&fixed=1');
  });

  it('gives one row for more than two repository courses, into the search', () => {
    const rows = entityRowsOf(entityCards.orgManyRepos, orgEntity);
    expect(ids(rows)).toEqual(['repo-courses', 'fixes', 'issues']);
    expect(rows[0]).toMatchObject({
      title: ['Courses about ', 4, ' of its repositories'],
      action: 'See the courses',
      href: '/learn/courses?q=nebula',
    });
  });
});

describe('entityNumberOf', () => {
  it('groups thousands', () => {
    expect(entityNumberOf(1234)).toBe('1,234');
  });
});
