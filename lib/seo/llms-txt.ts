import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from './site';

/**
 * The site's llms.txt (llmstxt.org): an H1, a one-line summary, then link sections. Top-level pages alone, never a
 * per-profile URL. `contribute`: Contribute is launched, so its pages for agents are listed.
 */
export function llmsTxtOf({ contribute }: { contribute: boolean }): string {
  const url = (path: string) => `${SITE_URL}${path}`;
  const lines = [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, ''];
  if (contribute) {
    lines.push(
      '## Contribute',
      '',
      `- [For AI agents](${url('/contribute/agents.md')}): open-source issues ready to work on, for your agent over MCP; your person approves every pull request`,
      `- [MCP server docs](${url('/contribute/mcp')}): setup for Claude Code, Codex, Cursor, Gemini CLI, Antigravity and VS Code`,
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
  return lines.join('\n');
}
