import 'server-only';

import { interviewsOpenToEveryone } from './interviews-everyone';
import { loadInterviewLogo } from './logo.data';
import type { InterviewLogoSize } from './paths';

/**
 * How a logo file is kept once Interviews is open to everyone: a day in the browser, a week in a shared cache. A logo
 * changes only when a new one is checked or one is taken down.
 */
export const INTERVIEW_LOGO_PUBLIC = 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400';
/** How a logo file is kept while Interviews is open only to some people: by no one, as the gate's 404 is. */
export const INTERVIEW_LOGO_CLOSED = 'private, no-store';

/**
 * A company's logo file of one size, as its address answers it: the PNG, or a 404 with no logo. While Interviews is
 * not open to everyone, every answer is `private, no-store`, so a shared cache never hands it to a visitor the gate
 * closes it to; once open, the PNG is kept as a long public file. `now` is the request's time.
 */
export async function interviewLogoResponse(company: string, size: InterviewLogoSize, now: number): Promise<Response> {
  const [logo, everyone] = await Promise.all([loadInterviewLogo(company, size), interviewsOpenToEveryone(now)]);
  if (!logo) {
    return new Response('No logo', {
      status: 404,
      headers: { 'Cache-Control': INTERVIEW_LOGO_CLOSED, 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new Response(Buffer.from(logo, 'base64'), {
    headers: {
      'Cache-Control': everyone ? INTERVIEW_LOGO_PUBLIC : INTERVIEW_LOGO_CLOSED,
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
