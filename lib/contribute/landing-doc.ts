import { type AgentPageStats, agentPageStatsLineOf } from './agent-page.types';
import { LANDING_QUESTIONS } from './faq';
import {
  LANDING_BAND_TEXT,
  LANDING_DEFAULTS,
  LANDING_DEFAULTS_HEAD,
  LANDING_HERO,
  LANDING_PR_FOOTER,
  LANDING_STEPS,
  LANDING_STEPS_TITLE,
  LANDING_WAYS,
  LANDING_WAYS_HEAD,
  prFooterTextOf,
} from './landing-copy';
import { CONTRIBUTE_RULES_PATH } from '@/lib/workspace/fair-use';
import { AGENTS_DOC_PATH, FAQ_PATH, MAINTAINERS_PATH, MCP_DOCS_PATH, WORKSPACE_PATHS } from '@/lib/workspace/paths';

const SITE = 'https://gitranks.com';

/** The day's numbers line; null when they are not there or can't be drawn. */
function statsLineOf(stats: AgentPageStats | null | undefined): string | null {
  try {
    // No issue ready: no zero count, the line is left out, as on the page.
    return stats?.readyIssues ? agentPageStatsLineOf(stats) : null;
  } catch {
    return null;
  }
}

/**
 * `/contribute.md`: Contribute's landing in Markdown, for an agent that opens it, in the page's order: what Contribute
 * is, the two ways, the steps, the defaults, what it promises maintainers, the questions, and the page for AI agents.
 * The same words as the page (`landing-copy.ts`, the landing's questions in `faq.ts`); the day's numbers when read.
 * The proof (the newest merged pull requests) is live data and stays out.
 */
export function contributeLandingDocOf(stats: AgentPageStats | null | undefined): string {
  const statsLine = statsLineOf(stats);
  const lines = [
    '# GitRanks Contribute',
    '',
    `> ${LANDING_HERO.title}`,
    '',
    LANDING_HERO.lead,
    '',
    LANDING_HERO.terms,
    '',
    ...(statsLine ? [`${statsLine}.`, ''] : []),
    `An AI agent connects over MCP: everything it needs is on the page for AI agents, ${SITE}${AGENTS_DOC_PATH}`,
    '',
    `## ${LANDING_WAYS_HEAD.title}`,
    '',
    LANDING_WAYS_HEAD.text,
    '',
  ];
  for (const way of LANDING_WAYS) {
    lines.push(`### ${way.title}`, '', `${way.top}. ${way.text}`, '');
    for (const { label, value } of way.facts) lines.push(`- ${label}: ${value}`);
    lines.push('');
  }
  lines.push(`## ${LANDING_STEPS_TITLE}`, '');
  LANDING_STEPS.forEach((step, index) => {
    lines.push(`${index + 1}. ${step.title} (${step.who}): ${step.text}`);
  });
  lines.push('', `## ${LANDING_DEFAULTS_HEAD.title}`, '', LANDING_DEFAULTS_HEAD.text, '');
  for (const { title, text } of LANDING_DEFAULTS) lines.push(`- ${title}: ${text}`);
  lines.push(
    '',
    '## Honest with maintainers',
    '',
    LANDING_BAND_TEXT,
    '',
    'At the end of the pull request:',
    '',
    // The footer's two lines, quoted as one block.
    ...LANDING_PR_FOOTER.flatMap((line, index) => [...(index ? ['>'] : []), `> ${prFooterTextOf(line)}`]),
    '',
    `For maintainers: ${SITE}${MAINTAINERS_PATH}`,
    '',
    '## Questions',
    '',
  );
  for (const { question, answer, more } of LANDING_QUESTIONS) {
    lines.push(`### ${question}`, '', answer, '');
    if (more) lines.push(`${more.label}: ${SITE}${more.href}`, '');
  }
  lines.push(
    '## More',
    '',
    `- Start contributing: ${SITE}${WORKSPACE_PATHS.contribute}`,
    `- For AI agents: ${SITE}${AGENTS_DOC_PATH}`,
    `- MCP server docs: ${SITE}${MCP_DOCS_PATH}`,
    `- Questions: ${SITE}${FAQ_PATH}`,
    `- Terms, the rules for issues from GitRanks: ${SITE}${CONTRIBUTE_RULES_PATH}`,
    '',
  );
  return lines.join('\n');
}
