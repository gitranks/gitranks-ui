import { describe, expect, it, vi } from 'vitest';

import {
  allThreePage,
  bothPage,
  builderPage,
  buildsAndFixesNumbers,
  buildsAndLearnsNumbers,
  contributorPage,
  firstFixPage,
  firstLessonPage,
  learnerPage,
} from './__fixtures__/skills';
import { skillsDescriptionOf, skillsJsonLdOf, skillsKnowsAboutOf, skillsMetadataOf, skillsTitleOf } from './seo';
import type { SkillsPage } from './skills.types';
import { skillsCardOf, skillsCardUrlOf } from './skills-share-card';

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
    expect(skillsDescriptionOf(contributorPage)).toBe(
      '5 fixes merged in 5 open-source projects, in Go, Python and TypeScript.',
    );
    expect(skillsDescriptionOf(firstFixPage)).toBe('1 fix merged in 1 open-source project, in Go.');
    expect(skillsDescriptionOf(openOnly)).toBe('1 pull request open in 1 open-source project, in Rust.');
  });

  it('says what a learner learned, with what they mastered, and both for someone who uses both', () => {
    expect(skillsDescriptionOf(learnerPage)).toBe('103 lessons learned in 3 courses, 2 mastered.');
    expect(skillsDescriptionOf(firstLessonPage)).toBe('1 lesson learned in 1 course.');
    expect(skillsDescriptionOf(bothPage)).toBe(
      '3 fixes merged in 3 open-source projects, in Go, Python and TypeScript, and 103 lessons learned in 3 courses.',
    );
  });

  it('says what a builder built, and puts the builds between the fixes and the lessons', () => {
    expect(skillsDescriptionOf(builderPage)).toBe('3 projects built with GitRanks Build.');
    expect(skillsDescriptionOf(allThreePage)).toBe(
      '3 fixes merged in 3 open-source projects, in Go, Python and TypeScript, 2 projects built with GitRanks Build, and 103 lessons learned in 3 courses.',
    );
    expect(skillsDescriptionOf({ ...contributorPage, numbers: buildsAndFixesNumbers })).toBe(
      '3 fixes merged in 3 open-source projects, in Go, Python and TypeScript, and 2 projects built with GitRanks Build.',
    );
    expect(skillsDescriptionOf({ ...learnerPage, numbers: buildsAndLearnsNumbers })).toBe(
      '2 projects built with GitRanks Build, and 103 lessons learned in 3 courses.',
    );
  });

  it('says what the page is for when no number has anything in it', () => {
    const empty = { ...contributorPage, numbers: { ...contributorPage.numbers, figures: [] } };
    expect(skillsDescriptionOf(empty)).toBe('What octocat fixed and learned with GitRanks.');
    const builder = { ...builderPage, numbers: { ...builderPage.numbers, figures: [] } };
    expect(skillsDescriptionOf(builder)).toBe('What octocat built with GitRanks Build.');
  });
});

describe("a Skills page's metadata", () => {
  it('is indexed only when the API says so, with its own address, its Skills picture and its Markdown copy', () => {
    const indexed = skillsMetadataOf({ ...contributorPage, indexable: true }, { name: 'Octo Cat' });
    expect(indexed.title).toEqual({ absolute: 'octocat’s skills · GitRanks' });
    expect(indexed.robots).toEqual({ index: true, follow: true });
    expect(indexed.alternates).toEqual({
      canonical: '/profile/octocat/skills',
      types: { 'text/markdown': '/profile/octocat/skills.md' },
    });
    const card = skillsCardOf(contributorPage);
    const image = {
      url: `https://gitranks.com${card ? skillsCardUrlOf(card) : '-'}`,
      width: 1200,
      height: 630,
      alt: 'octocat fixes real issues in open-source projects',
    };
    expect(indexed.openGraph?.images).toEqual([image]);
    expect(indexed.twitter).toMatchObject({ card: 'summary_large_image', images: [image] });
    const fresh = skillsMetadataOf({ ...contributorPage, indexable: false });
    expect(fresh.robots).toEqual({ index: false, follow: true });
  });

  it('keeps the avatar when the picture has nothing to draw', () => {
    const empty = { ...learnerPage, numbers: { ...learnerPage.numbers, blockFigures: [] } };
    const avatar = skillsMetadataOf(empty, { name: 'Octo Cat' });
    expect(JSON.stringify(avatar.openGraph)).toContain('https://gitranks.com/api/avatar/octocat');
    expect(JSON.stringify(avatar.openGraph)).toContain('GitHub avatar of Octo Cat (@octocat)');
  });
});

describe("a Skills page's structured data", () => {
  it('is a profile page about the person, who knows the courses they learned in and the languages of their fixes', () => {
    const [page, crumbs] = skillsJsonLdOf(bothPage, { name: 'Octo Cat' }) as Record<string, any>[];
    expect(page['@type']).toBe('ProfilePage');
    expect(page.url).toBe('https://gitranks.com/profile/octocat/skills');
    expect(page.mainEntity).toMatchObject({
      '@type': 'Person',
      name: 'Octo Cat',
      alternateName: 'octocat',
      url: 'https://gitranks.com/profile/octocat',
      sameAs: ['https://github.com/octocat'],
    });
    expect(page.mainEntity.knowsAbout).toEqual(skillsKnowsAboutOf(bothPage));
    expect(page.mainEntity.knowsAbout).toEqual([
      'Algorithms and data structures',
      'Go',
      'Databases and SQL',
      'Python',
      'TypeScript',
    ]);
    expect(crumbs.itemListElement.map((item: { name: string }) => item.name)).toEqual(['Home', 'Octo Cat', 'Skills']);
  });

  it('names no knowledge when there is none', () => {
    const none = { ...learnerPage, numbers: { ...learnerPage.numbers, languages: [] }, courses: [] };
    const [page] = skillsJsonLdOf(none) as Record<string, any>[];
    expect(page.mainEntity.knowsAbout).toBeUndefined();
    expect(page.mainEntity.name).toBe('octocat');
  });
});
