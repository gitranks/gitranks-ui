import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site';
import type { PublicLesson } from '@/lib/learn/learn.types';
import { LEARN_MAINTAINERS_PATH, LEARN_PATH, lessonPath } from '@/lib/learn/learn-path';
import { REGISTRIES, REGISTRY_IDS, type RegistryId, registryHasDownloads } from '@/lib/packages/registries';
import { packageRankingPath } from '@/utils/package-paths';

/** The most recent public lessons llms.txt names. */
export const LLMS_TXT_LESSONS = 20;

/** A registry's lines in the packages section: its rankings, the address of a package's page and of its facts. */
function registryPackageLines(registry: RegistryId, url: (path: string) => string): string[] {
  const { article, label } = REGISTRIES[registry];
  const downloads = registryHasDownloads(registry);
  const first = downloads ? 'downloads' : 'dependents-stars';
  const rankedBy = `${downloads ? 'weekly downloads, by ' : ''}the stars of the repositories that use them, and by how many do`;
  return [
    `- [${label} package rankings](${url(packageRankingPath(first, 1, registry))}): ${label} packages ranked by ${rankedBy}. Beta.`,
    `- Package page: ${url(`/package/${registry}/{name}`)} — who uses ${article} ${label} package: every repository with 100+ stars that depends on it directly, with ${downloads ? 'downloads and ' : ''}ranks.`,
    `- Package facts in markdown: ${url(`/package/${registry}/{name}/facts.md`)} — the same as the package page, for agents: dependents${downloads ? ', downloads' : ''} and ranks, each with its link.`,
  ];
}

/**
 * The site's llms.txt (llmstxt.org): an H1, a one-line summary, then link sections. Top-level pages alone, never a
 * per-profile URL. `contribute`: Contribute is launched, so its pages for agents are listed. `packages`: package pages
 * are open to everyone, so the package rankings, the address patterns of a package's page and a repository's Used by
 * tab, and the Unsung heroes archive are listed. `learn`: Learn's front door is open to visitors, so Learn's pages and its
 * most recent public lessons (newest first, at most `LLMS_TXT_LESSONS`) are listed; null leaves Learn out.
 */
export function llmsTxtOf({
  contribute,
  packages,
  learn = null,
}: {
  contribute: boolean;
  packages: boolean;
  learn?: readonly PublicLesson[] | null;
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
  }
  if (learn) {
    lines.push(
      '## Learn',
      '',
      `- [GitRanks Learn](${url(LEARN_PATH)}): your coding agent fixes a real open-source issue and writes a 10-minute lesson on its fix; its person passes a check on it before the pull request opens`,
      `- [For maintainers](${url(LEARN_MAINTAINERS_PATH)}): what a Learn pull request is`,
      ...learn
        .slice(0, LLMS_TXT_LESSONS)
        .map(
          (lesson) =>
            `- [${oneLine(lesson.title)}](${url(lessonPath(lesson.slug))}): a lesson on a fix${lesson.repo ? ` in ${oneLine(lesson.repo)}` : ''}${lesson.language ? ` (${oneLine(lesson.language)})` : ''}`,
        ),
      '',
    );
  }
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
  if (packages) {
    lines.push(
      '## Packages',
      '',
      ...REGISTRY_IDS.flatMap((registry) => registryPackageLines(registry, url)),
      `- Repository "Used by": ${url('/repo/{owner}/{name}/used-by')} — the same for every package a repository publishes.`,
      `- [How package rankings work](${url('/methodology/packages')})`,
      `- [Unsung heroes](${url('/unsung-heroes')}): one open-source project a week that a lot of software runs on, and few people star`,
      '',
    );
  }
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
