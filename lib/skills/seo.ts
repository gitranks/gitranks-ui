import type { Metadata } from 'next';

import { skillsMarkdownPath, skillsPath, skillsProfilePath } from './paths';
import type { SkillsFigure, SkillsPage } from './skills.types';
import { countOf, listWords, numbersFor, shownFigures } from './skills-figures';
import { skillsCardAltOf, skillsCardOf, skillsCardUrlOf } from './skills-share-card';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { type PreviewImage, pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import { avatarPath, userAvatarAlt } from '@/utils/avatar-path';

/*
 * A Skills page for search engines and posted links: its title, its description, whether it may be indexed, and its
 * structured data with what the person knows. Pure, from the public answer and the profile's name alone. While Learn
 * is not open to everyone, nothing of Learn is named.
 */

/** "octocat’s skills · GitRanks". */
export const skillsTitleOf = (login: string) => `${login}’s skills · GitRanks`;

const counted = (value: number, one: string, many: string) => `${countOf(value)} ${value === 1 ? one : many}`;

/** "5 fixes merged in 5 open-source projects"; null for a figure that counts no fix. */
function fixesClauseOf(figure: SkillsFigure | undefined): string | null {
  if (!figure?.value) return null;
  const what =
    figure.key === 'FIXES_MERGED'
      ? counted(figure.value, 'fix merged', 'fixes merged')
      : counted(figure.value, 'pull request open', 'pull requests open');
  const where = figure.second ? ` in ${counted(figure.second, 'open-source project', 'open-source projects')}` : '';
  return `${what}${where}`;
}

/** "103 lessons learned in 3 courses"; null without one. */
function lessonsClauseOf(figure: SkillsFigure | undefined): string | null {
  if (!figure?.value) return null;
  const where = figure.second ? ` in ${counted(figure.second, 'course', 'courses')}` : '';
  return `${counted(figure.value, 'lesson learned', 'lessons learned')}${where}`;
}

/**
 * The description: "5 fixes merged in 5 open-source projects, in Go, Python and TypeScript.", "103 lessons learned in 3
 * courses, 2 mastered.", or both clauses for someone who uses both. A page with no number says what it is for.
 */
export function skillsDescriptionOf(page: Pick<SkillsPage, 'login' | 'numbers'>, learnOpen: boolean): string {
  const numbers = numbersFor(page.numbers, learnOpen);
  const figures = shownFigures(numbers.figures);
  const find = (key: SkillsFigure['key']) => figures.find((figure) => figure.key === key);
  const fixes = fixesClauseOf(find('FIXES_MERGED') ?? find('PULL_REQUESTS_OPEN'));
  const languages = numbers.languages.slice(0, 3);
  const fixesPart = fixes && languages.length ? `${fixes}, in ${listWords(languages)}` : fixes;
  const lessons = lessonsClauseOf(find('LESSONS_LEARNED'));
  const mastered = find('MASTERED');
  if (fixesPart && lessons) return `${fixesPart}, and ${lessons}.`;
  if (fixesPart) return `${fixesPart}.`;
  if (lessons) return mastered?.value ? `${lessons}, ${countOf(mastered.value)} mastered.` : `${lessons}.`;
  return learnOpen ? `What ${page.login} fixed and learned with GitRanks.` : `What ${page.login} fixed with GitRanks.`;
}

/** What the person knows, for structured data: the courses with a lesson learned, then the languages of their fixes. */
export function skillsKnowsAboutOf(page: Pick<SkillsPage, 'courses' | 'numbers'>, learnOpen: boolean): string[] {
  const courses = learnOpen ? page.courses.map((course) => course.course.name) : [];
  return [...new Set([...courses, ...page.numbers.languages])];
}

/** A posted link's picture: the Skills card, or the avatar while the card has nothing to draw. */
function previewImageOf(
  page: Pick<SkillsPage, 'login' | 'numbers'>,
  name: string | null,
  learnOpen: boolean,
): PreviewImage {
  const card = skillsCardOf(page, learnOpen);
  return card
    ? { url: absoluteUrl(skillsCardUrlOf(card)), ...SOCIAL_CARD_SIZE, alt: skillsCardAltOf(card) }
    : { url: absoluteUrl(avatarPath(page.login)), alt: userAvatarAlt(page.login, name) };
}

/** The page's metadata: indexed only once the API says so (5 lessons learned or a merged fix). */
export function skillsMetadataOf(
  page: Pick<SkillsPage, 'login' | 'numbers' | 'indexable'>,
  { name = null, learnOpen }: { name?: string | null; learnOpen: boolean },
): Metadata {
  const base = pageMetadata({
    title: { absolute: skillsTitleOf(page.login) },
    description: skillsDescriptionOf(page, learnOpen),
    path: skillsPath(page.login),
    images: [previewImageOf(page, name, learnOpen)],
    openGraphType: 'profile',
  });
  return {
    ...base,
    alternates: { ...base.alternates, types: { 'text/markdown': skillsMarkdownPath(page.login) } },
    robots: { index: page.indexable, follow: true },
  };
}

/** The page's structured data: a profile page about the person, with what they know, and its breadcrumbs. */
export function skillsJsonLdOf(
  page: Pick<SkillsPage, 'login' | 'numbers' | 'courses'>,
  { name = null, learnOpen }: { name?: string | null; learnOpen: boolean },
): object[] {
  const url = absoluteUrl(skillsPath(page.login));
  const profile = absoluteUrl(skillsProfilePath(page.login));
  const knowsAbout = skillsKnowsAboutOf(page, learnOpen);
  const person = {
    '@type': 'Person',
    name: name || page.login,
    alternateName: page.login,
    url: profile,
    image: absoluteUrl(avatarPath(page.login)),
    sameAs: [`https://github.com/${page.login}`],
    ...(knowsAbout.length ? { knowsAbout } : {}),
  };
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url,
      name: skillsTitleOf(page.login),
      description: skillsDescriptionOf(page, learnOpen),
      mainEntity: person,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: name && name !== page.login ? name : page.login, item: profile },
        { '@type': 'ListItem', position: 3, name: 'Skills', item: url },
      ],
    },
  ];
}
