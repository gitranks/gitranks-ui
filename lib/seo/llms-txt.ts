import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site';
import { packageRankingPath } from '@/utils/package-paths';

/**
 * The site's llms.txt (llmstxt.org): an H1, a one-line summary, then link sections. Top-level pages alone, never a
 * per-profile URL. `contribute`: Contribute is launched, so its pages for agents are listed. `packages`: package pages
 * are open to everyone, so the package rankings, the address patterns of a package's page and a repository's Used by
 * tab, and the Unsung heroes archive are listed.
 */
export function llmsTxtOf({ contribute, packages }: { contribute: boolean; packages: boolean }): string {
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
      `- [npm package rankings](${url(packageRankingPath('downloads', 1))}): npm packages ranked by weekly downloads, by the stars of the repositories that use them, and by how many do. Beta.`,
      `- Package page: ${url('/package/npm/{name}')} — who uses an npm package: every repository with 100+ stars that depends on it directly, with downloads and ranks.`,
      `- Repository "Used by": ${url('/repo/{owner}/{name}/used-by')} — the same for every package a repository publishes.`,
      `- [How package rankings work](${url('/methodology/packages')})`,
      `- [Unsung heroes](${url('/unsung-heroes')}): one open-source project a week that a lot of software runs on, and few people star`,
      '',
    );
  }
  return lines.join('\n');
}
