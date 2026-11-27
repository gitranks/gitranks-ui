import 'server-only';

import { CompanyShareCard, InterviewsShareCard, PlanShareCard } from './interviews-cards';
import {
  INTERVIEW_CARD_LOGO_SIZE,
  INTERVIEWS_HOME_CARD_PATH,
  interviewCompanyCardPath,
  interviewPlanCardPath,
} from '@/lib/interviews/paths';
import { type InterviewShareState, interviewCardHeadersOf, interviewNotServedResponse } from '@/lib/interviews/share';
import {
  cardTopOf,
  companyCardVersionOf,
  interviewsCardVersionOf,
  planCardVersionOf,
} from '@/lib/interviews/share-card';
import type { InterviewCompanyPage, InterviewPlanPage, InterviewsHome } from '@/lib/interviews/types';
import { drawSocialCard } from '@/lib/social-card/social-card';

/*
 * The answers of Interviews' three pictures. Each is drawn under exactly `?v=<version>`: any other query is a 308 to
 * its current address, so no query makes it draw again. A company's or a plan's follows its page's state
 * (`share.ts`). Only public reads are drawn: the picture is the same for everyone.
 */

/** Reads a picture's logo files by company slug (`share.data.ts`): base64 PNG, or null for the letter. */
type LogosOf = (
  companies: readonly { slug: string; name: string; logo: boolean }[],
  size: 128 | typeof INTERVIEW_CARD_LOGO_SIZE,
) => Promise<ReadonlyMap<string, string | null>>;

/** What draws the PNG: the site's link-preview cards, or a spec's stand-in. */
type Draw = typeof drawSocialCard;

/** The picture could not be drawn now: asked again in a minute. */
const unavailable = () =>
  new Response('The picture could not be drawn. Try again in a minute.\n', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'Retry-After': '60' },
  });

/** A picture under exactly `?v=<version>`, else a 308 to its current address. */
async function versionedCard(
  path: string,
  version: string,
  search: string,
  draw: () => Promise<Uint8Array<ArrayBuffer>>,
): Promise<Response> {
  if (search !== `?v=${version}`) {
    return new Response(null, {
      status: 308,
      headers: { Location: `${path}?v=${version}`, 'Cache-Control': 'private, no-store' },
    });
  }
  try {
    return new Response(await draw(), { headers: interviewCardHeadersOf() });
  } catch (error) {
    console.error('Error drawing an Interviews card:', error);
    return unavailable();
  }
}

/** Interviews' picture, from the home read as everyone reads it, with the top five's logos (the 128 px file). */
export async function interviewsCardResponse(
  search: string,
  home: () => Promise<InterviewsHome>,
  logosOf: LogosOf,
  draw: Draw = drawSocialCard,
): Promise<Response> {
  let read: InterviewsHome;
  try {
    read = await home();
  } catch {
    return unavailable();
  }
  const top = cardTopOf(read);
  return versionedCard(INTERVIEWS_HOME_CARD_PATH, interviewsCardVersionOf(read), search, async () =>
    draw(<InterviewsShareCard top={top} logos={await logosOf(top, 128)} />),
  );
}

/** A company's picture, by its page's state, with its logo (the 256 px file). */
export async function companyCardResponse(
  search: string,
  state: () => Promise<InterviewShareState<InterviewCompanyPage>>,
  logosOf: LogosOf,
  draw: Draw = drawSocialCard,
): Promise<Response> {
  let found: InterviewShareState<InterviewCompanyPage>;
  try {
    found = await state();
  } catch {
    return unavailable();
  }
  if (found.kind !== 'live') return interviewNotServedResponse(found, '/card.png');
  const { page } = found;
  return versionedCard(interviewCompanyCardPath(page.company.slug), companyCardVersionOf(page), search, async () => {
    const logos = await logosOf([page.company], INTERVIEW_CARD_LOGO_SIZE);
    return draw(<CompanyShareCard page={page} logo={logos.get(page.company.slug) ?? null} />);
  });
}

/** A plan's picture, by its page's state, with its company's logo (the 256 px file). */
export async function planCardResponse(
  search: string,
  state: () => Promise<InterviewShareState<InterviewPlanPage>>,
  logosOf: LogosOf,
  draw: Draw = drawSocialCard,
): Promise<Response> {
  let found: InterviewShareState<InterviewPlanPage>;
  try {
    found = await state();
  } catch {
    return unavailable();
  }
  if (found.kind !== 'live') return interviewNotServedResponse(found, '/card.png');
  const { page } = found;
  return versionedCard(
    interviewPlanCardPath(page.company.slug, page.slug),
    planCardVersionOf(page),
    search,
    async () => {
      const logos = await logosOf([page.company], INTERVIEW_CARD_LOGO_SIZE);
      return draw(<PlanShareCard plan={page} logo={logos.get(page.company.slug) ?? null} />);
    },
  );
}
