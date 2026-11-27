import { interviewCompanyMarkdownOf, interviewPlanMarkdownOf, interviewsHomeMarkdownOf } from './markdown';
import { INTERVIEWS_HOME_PATH, interviewCompanyPath, interviewPlanPath } from './paths';
import { type InterviewShareState, interviewMarkdownHeadersOf, interviewNotServedResponse } from './share';
import type { InterviewCompanyPage, InterviewPlanPage, InterviewsHome } from './types';

/*
 * The answers of Interviews' Markdown copies. A company's and a plan's follow the page's state (`share.ts`): a moved
 * one goes to its new copy. Each names its page as the canonical. Kept by no one until Interviews is open to
 * everyone (`interviewMarkdownHeadersOf`).
 */

/** A copy's answer, its page named as the canonical. */
const markdownResponse = (text: string, page: string) =>
  new Response(text, { headers: { ...interviewMarkdownHeadersOf(), Link: `<${page}>; rel="canonical"` } });

/** The page could not be read now: asked again in a minute. */
const unavailable = () => interviewNotServedResponse({ kind: 'unavailable' }, '.md');

/** Interviews home's copy (`/interviews.md`): its words with every company, or without them when they cannot be read. */
export async function interviewsHomeMarkdownResponse(home: () => Promise<InterviewsHome>): Promise<Response> {
  const read = await home().catch(() => ({ companies: [] }));
  return markdownResponse(interviewsHomeMarkdownOf(read), INTERVIEWS_HOME_PATH);
}

/** A company's copy, by its page's state. */
export async function interviewCompanyMarkdownResponse(
  state: () => Promise<InterviewShareState<InterviewCompanyPage>>,
): Promise<Response> {
  let found: InterviewShareState<InterviewCompanyPage>;
  try {
    found = await state();
  } catch {
    return unavailable();
  }
  if (found.kind !== 'live') return interviewNotServedResponse(found, '.md');
  return markdownResponse(interviewCompanyMarkdownOf(found.page), interviewCompanyPath(found.page.company.slug));
}

/** A plan's copy, by its page's state. */
export async function interviewPlanMarkdownResponse(
  state: () => Promise<InterviewShareState<InterviewPlanPage>>,
): Promise<Response> {
  let found: InterviewShareState<InterviewPlanPage>;
  try {
    found = await state();
  } catch {
    return unavailable();
  }
  if (found.kind !== 'live') return interviewNotServedResponse(found, '.md');
  const { page } = found;
  return markdownResponse(interviewPlanMarkdownOf(page), interviewPlanPath(page.company.slug, page.slug));
}
