import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site';
import type { LearnCourseCard } from '@/lib/learn/course';
import type { PublicLesson } from '@/lib/learn/learn.types';
import { LEARN_MAINTAINERS_PATH, LEARN_PATH, lessonPath } from '@/lib/learn/learn-path';
import {
  courseMarkdownPath,
  LEARN_COURSES_MARKDOWN_PATH,
  LEARN_COURSES_PATH,
  LEARN_LANDING_MARKDOWN_PATH,
} from '@/lib/learn/paths';
import {
  DOWNLOADS_UNIT_TEXT,
  downloadsUnitOf,
  isDownloadsPending,
  REGISTRY_IDS,
  type RegistryId,
  registryOf,
} from '@/lib/packages/registries';
import { packageRankingPath } from '@/utils/package-paths';

/** The most recent public lessons llms.txt names. */
export const LLMS_TXT_LESSONS = 20;

/**
 * A registry's lines in the packages section: its rankings (by downloads in its own unit; by dependents alone where it
 * publishes no download counts, or its first count is not read yet: then nothing is said of downloads), the address
 * of a package's page, with the form of its name there (`{groupId}/{artifactId}`) and its spelling where the registry
 * takes several as one, and of its facts.
 */
function registryPackageLines(registry: RegistryId, url: (path: string) => string): string[] {
  const { article, label, nameInAddress, addressPattern = '{name}' } = registryOf(registry);
  const downloads = downloadsUnitOf(registry);
  const uncounted = downloads || isDownloadsPending(registry) ? '' : ` ${label} publishes no download counts.`;
  const first = downloads ? 'downloads' : 'dependents-stars';
  const rankedBy = `${downloads ? `${DOWNLOADS_UNIT_TEXT[downloads].adjective} downloads, by ` : ''}the stars of the repositories that use them, and by how many do`;
  const name = nameInAddress ? ` (${addressPattern} ${nameInAddress})` : '';
  return [
    `- [${label} package rankings](${url(packageRankingPath(first, 1, registry))}): ${label} packages ranked by ${rankedBy}. Beta.${uncounted}`,
    `- Package page: ${url(`/package/${registry}/${addressPattern}`)}${name} — who uses ${article} ${label} package: every repository with 100+ stars that depends on it directly, with ${downloads ? 'downloads and ' : ''}ranks.`,
    `- Package facts in markdown: ${url(`/package/${registry}/${addressPattern}/facts.md`)} — the same as the package page, for agents: dependents${downloads ? ', downloads' : ''} and ranks, each with its link.`,
  ];
}

/**
 * The site's llms.txt (llmstxt.org): an H1, a one-line summary, then link sections. Top-level pages alone, never a
 * per-profile URL. `contribute`: Contribute is launched, so its pages for agents and its pull request timelines are listed. The packages section
 * lists the package rankings, the address patterns of a package's page and a repository's Used by tab, and the Unsung
 * heroes archive. Learn's pages are listed with its courses (`learnCourses`, each with its Markdown copy) and its most
 * recent public lessons of a fix (`learn`, newest first, at most `LLMS_TXT_LESSONS`).
 */
export function llmsTxtOf({
  contribute,
  learn = [],
  learnCourses = [],
}: {
  contribute: boolean;
  learn?: readonly PublicLesson[];
  learnCourses?: readonly Pick<LearnCourseCard, 'slug' | 'name' | 'covers'>[];
}): string {
  const url = (path: string) => `${SITE_URL}${path}`;
  const lines = [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, ''];
  if (contribute) {
    lines.push(
      '## Contribute',
      '',
      `- [For AI agents](${url('/contribute/agents.md')}): open-source issues ready to work on, for your agent over MCP; your person approves every pull request`,
      `- [MCP server docs](${url('/contribute/mcp')}): sign in with GitHub from Claude Code, Codex, ChatGPT, Cursor, Gemini CLI, Antigravity, VS Code, claude.ai, Kiro and more, or use a token`,
      `- [Questions](${url('/contribute/faq')})`,
      '',
    );
    // Its pull request timelines: what one is, its address, its Markdown and its sitemap.
    lines.push(
      '## Pull request timelines',
      '',
      "Every pull request opened with GitRanks Contribute or GitRanks Learn can have a public page of how it was made: the fix, our checks, the approval, the maintainers' review rounds, and the merge or close. No conversation with the agent, no costs. A Learn fix has a second view, Learn from it: its walkthrough and the lesson it used.",
      '',
      `- How it was made: ${url('/contribute/pr/<owner>/<repo>/<number>')}`,
      `- Learn from it: ${url('/learn/fixes/<owner>/<repo>/<number>')}`,
      `- Markdown, both views: ${url('/contribute/pr/<owner>/<repo>/<number>/timeline.md')}`,
      `- [Sitemap](${url('/sitemaps/contribute-prs/sitemap.xml')}): every public pull request page`,
      '',
    );
  }
  lines.push(
    '## Learn',
    '',
    `- [GitRanks Learn](${url(LEARN_PATH)}): short programming lessons, each one idea with an example and one question, then real open-source issues to use them on ([Markdown](${url(LEARN_LANDING_MARKDOWN_PATH)}))`,
    `- [All courses](${url(LEARN_COURSES_PATH)}) ([Markdown](${url(LEARN_COURSES_MARKDOWN_PATH)}))`,
    ...learnCourses.map(
      (course) =>
        `- [${oneLine(course.name)}](${url(courseMarkdownPath(course.slug))}): ${oneLine(course.covers) || 'a course of GitRanks Learn'}`,
    ),
    `- [For maintainers](${url(LEARN_MAINTAINERS_PATH)}): what a Learn pull request is`,
    ...learn
      .slice(0, LLMS_TXT_LESSONS)
      .map(
        (lesson) =>
          `- [${oneLine(lesson.title)}](${url(lessonPath(lesson.slug))}): a lesson on a fix${lesson.repo ? ` in ${oneLine(lesson.repo)}` : ''}${lesson.language ? ` (${oneLine(lesson.language)})` : ''}`,
      ),
    '',
  );
  lines.push(
    '## Rankings and badges',
    '',
    `- [Home](${url('/')}): GitHub developers ranked by stars, followers and contributions`,
    `- [Organizations](${url('/orgs')})`,
    `- [README badges](${url('/badge')}): badges for profiles, organizations and repositories`,
    `- [Badge gallery](${url('/badge/gallery')})`,
    `- [How ranking works](${url('/methodology')})`,
    '',
  );
  lines.push(
    '## Packages',
    '',
    ...REGISTRY_IDS.flatMap((registry) => registryPackageLines(registry, url)),
    `- Repository "Used by": ${url('/repo/{owner}/{name}/used-by')} — the same for every package a repository publishes.`,
    `- [How package rankings work](${url('/methodology/packages')})`,
    `- [Unsung heroes](${url('/unsung-heroes')}): one open-source project a week that a lot of software runs on, and few people star`,
    '',
  );
  return lines.join('\n');
}

/**
 * Text from a lesson as plain words on one line of markdown: no line break, and none of the characters that would end
 * or escape a link, start an autolink or open code.
 */
function oneLine(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[[\]\\<>`]/g, '')
    .trim();
}
