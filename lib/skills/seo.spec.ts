import { describe, expect, it, vi } from 'vitest';

import { bothPage, contributorPage, firstFixPage, firstLessonPage, learnerPage } from './__fixtures__/skills';
import { skillsDescriptionOf, skillsJsonLdOf, skillsKnowsAboutOf, skillsMetadataOf, skillsTitleOf } from './seo';
import type { SkillsPage } from './skills.types';

// The site's address is read once, as the module loads: vitest runs this before the imports.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const openOnly: SkillsPage = {
  ...contributorPage,
  numbers: {
    ...contributorPage.numbers,
    figures: [
      { key: 'PULL_REQUESTS_OPEN', value: 1, second: 1, name: null, also: null },
      { key: 'DAYS_ACTIVE', value: 2, second: null, name: null, also: null },
    ],
    languages: ['Rust'],
  },
};

describe("a Skills page's title and description", () => {
  it('is "<login>’s skills · GitRanks"', () => {
    expect(skillsTitleOf('octocat')).toBe('octocat’s skills · GitRanks');
  });

  it('says what a contributor fixed, where and in which languages, singular for one', () => {
    expect(skillsDescriptionOf(contributorPage, true)).toBe(
      '5 fixes merged in 5 open-source projects, in Go, Python and TypeScript.',
    );
    expect(skillsDescriptionOf(firstFixPage, true)).toBe('1 fix merged in 1 open-source project, in Go.');
    expect(skillsDescriptionOf(openOnly, true)).toBe('1 pull request open in 1 open-source project, in Rust.');
  });

  it('says what a learner learned, with what they mastered, and both for someone who uses both', () => {
    expect(skillsDescriptionOf(learnerPage, true)).toBe('103 lessons learned in 3 courses, 2 mastered.');
    expect(skillsDescriptionOf(firstLessonPage, true)).toBe('1 lesson learned in 1 course.');
    expect(skillsDescriptionOf(bothPage, true)).toBe(
      '3 fixes merged in 3 open-source projects, in Go, Python and TypeScript, and 103 lessons learned in 3 courses.',
    );
  });

  it('names nothing of Learn while it is not open to everyone', () => {
    expect(skillsDescriptionOf(bothPage, false)).toBe(
      '3 fixes merged in 3 open-source projects, in Go, Python and TypeScript.',
    );
    expect(skillsDescriptionOf(learnerPage, false)).toBe('What octocat fixed with GitRanks.');
  });

  it('says what the page is for when no number has anything in it', () => {
    const empty = { ...contributorPage, numbers: { ...contributorPage.numbers, figures: [] } };
    expect(skillsDescriptionOf(empty, true)).toBe('What octocat fixed and learned with GitRanks.');
  });
});

describe("a Skills page's metadata", () => {
  it('is indexed only when the API says so, with its own address, the avatar and its Markdown copy', () => {
    const indexed = skillsMetadataOf({ ...contributorPage, indexable: true }, { name: 'Octo Cat', learnOpen: true });
    expect(indexed.title).toEqual({ absolute: 'octocat’s skills · GitRanks' });
    expect(indexed.robots).toEqual({ index: true, follow: true });
    expect(indexed.alternates).toEqual({
      canonical: '/profile/octocat/skills',
      types: { 'text/markdown': '/profile/octocat/skills.md' },
    });
    expect(JSON.stringify(indexed.openGraph)).toContain('https://gitranks.com/api/avatar/octocat');
    expect(JSON.stringify(indexed.openGraph)).toContain('GitHub avatar of Octo Cat (@octocat)');
    const fresh = skillsMetadataOf({ ...contributorPage, indexable: false }, { learnOpen: true });
    expect(fresh.robots).toEqual({ index: false, follow: true });
  });
});

describe("a Skills page's structured data", () => {
  it('is a profile page about the person, who knows the courses they learned in and the languages of their fixes', () => {
    const [page, crumbs] = skillsJsonLdOf(bothPage, { name: 'Octo Cat', learnOpen: true }) as Record<string, any>[];
    expect(page['@type']).toBe('ProfilePage');
    expect(page.url).toBe('https://gitranks.com/profile/octocat/skills');
    expect(page.mainEntity).toMatchObject({
      '@type': 'Person',
      name: 'Octo Cat',
      alternateName: 'octocat',
      url: 'https://gitranks.com/profile/octocat',
      sameAs: ['https://github.com/octocat'],
    });
    expect(page.mainEntity.knowsAbout).toEqual(skillsKnowsAboutOf(bothPage, true));
    expect(page.mainEntity.knowsAbout).toEqual([
      'Algorithms and data structures',
      'Go',
      'Databases and SQL',
      'Python',
      'TypeScript',
    ]);
    expect(crumbs.itemListElement.map((item: { name: string }) => item.name)).toEqual(['Home', 'Octo Cat', 'Skills']);
  });

  it('names no course while Learn is not open to everyone, and no knowledge when there is none', () => {
    expect(skillsKnowsAboutOf(bothPage, false)).toEqual(['Go', 'Python', 'TypeScript']);
    const none = { ...learnerPage, numbers: { ...learnerPage.numbers, languages: [] } };
    const [page] = skillsJsonLdOf(none, { learnOpen: false }) as Record<string, any>[];
    expect(page.mainEntity.knowsAbout).toBeUndefined();
    expect(page.mainEntity.name).toBe('octocat');
  });
});
