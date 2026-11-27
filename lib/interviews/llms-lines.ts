import {
  INTERVIEWS_ABOUT_PATH,
  INTERVIEWS_HOME_MARKDOWN_PATH,
  INTERVIEWS_HOME_PATH,
  interviewCompanyMarkdownPath,
  interviewPlanMarkdownPath,
} from './paths';
import type { InterviewsHome } from './types';

/** A name as plain words on one line of Markdown: none of the characters that would end or escape a link. */
const oneLine = (text: string): string =>
  text
    .replace(/\s+/g, ' ')
    .replace(/[[\]\\<>`]/g, '')
    .trim();

/**
 * Interviews' section of the site's `llms.txt`, listed once Interviews is open to everyone: its home and How it works, the address of a company's and a plan's Markdown copy, then each
 * company that has a plan with its plans, each linked to its copy.
 */
export function interviewsLlmsLinesOf(
  home: Pick<InterviewsHome, 'companies'>,
  url: (path: string) => string,
): string[] {
  const companies = home.companies.filter((card) => card.company?.slug && card.plans.length > 0);
  return [
    '## Interviews',
    '',
    `- [GitRanks Interviews](${url(INTERVIEWS_HOME_PATH)}): interview plans for engineers. A plan follows the real rounds of one company's interview, in order, with short lessons for each round. Built from public sources, each fact with who states it; not official pages of the companies ([Markdown](${url(INTERVIEWS_HOME_MARKDOWN_PATH)}))`,
    `- [How it works](${url(INTERVIEWS_ABOUT_PATH)}): where the facts come from`,
    `- A company's page in Markdown: ${url('/interviews/<company>.md')}`,
    `- A plan's page in Markdown: ${url('/interviews/<company>/<plan>.md')}`,
    ...companies.flatMap((card) => [
      `- [${oneLine(card.company.name)}](${url(interviewCompanyMarkdownPath(card.company.slug))}): ${card.plans.length} ${card.plans.length === 1 ? 'plan' : 'plans'}`,
      ...card.plans.map(
        (plan) => `  - [${oneLine(plan.name)}](${url(interviewPlanMarkdownPath(plan.company.slug, plan.slug))})`,
      ),
    ]),
    '',
  ];
}
