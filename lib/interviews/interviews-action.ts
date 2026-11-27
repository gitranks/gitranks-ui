/*
 * What Interviews' writes from the browser get back: the API's data, or why it was not taken.
 */

/**
 * Why a write was not taken:
 * - `SIGNED_OUT`: no session, or one that needs a new sign-in.
 * - `NOT_FOUND`: no such company or plan, or Interviews is not open to the person.
 * - `INVALID`: not of the shape the API takes, or refused by it.
 * - `LIMITED`: the person sent as many reports today as one day takes.
 * - `FAILED`: anything else, an API that does not know Interviews yet included.
 */
export type InterviewsActionError = 'SIGNED_OUT' | 'NOT_FOUND' | 'INVALID' | 'LIMITED' | 'FAILED';

export type InterviewsActionResult<T> = { ok: true; data: T } | { ok: false; error: InterviewsActionError };

type GraphqlError = { extensions?: { code?: string } };

/** GraphQL errors as the client throws them: the `errors` array as JSON in the message. */
const codesOf = (error: unknown): string[] => {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '');
    return Array.isArray(parsed) ? parsed.map((item: GraphqlError) => item?.extensions?.code ?? '') : [];
  } catch {
    return [];
  }
};

/** The codes a refusal for too many reports may carry. */
const LIMIT_CODES: ReadonlySet<string> = new Set(['TOO_MANY_REQUESTS', 'RATE_LIMITED']);

/** Why a call failed, as an Interviews page acts on it. */
export function interviewsErrorOf(error: unknown): InterviewsActionError {
  const codes = codesOf(error);
  if (codes.some((code) => LIMIT_CODES.has(code))) return 'LIMITED';
  if (codes.includes('NOT_FOUND')) return 'NOT_FOUND';
  if (codes.includes('UNAUTHENTICATED')) return 'SIGNED_OUT';
  if (codes.some((code) => code === 'BAD_USER_INPUT' || code === 'BAD_REQUEST' || code === 'FORBIDDEN')) {
    return 'INVALID';
  }
  return 'FAILED';
}

/** The HTTP status a write's route answers with for each refusal. */
export const INTERVIEWS_ACTION_STATUS: Record<InterviewsActionError, number> = {
  SIGNED_OUT: 401,
  NOT_FOUND: 404,
  INVALID: 400,
  LIMITED: 429,
  FAILED: 502,
};

/** A write refused before the API is asked. */
export const invalidInterviewsAction = <T>(): InterviewsActionResult<T> => ({ ok: false, error: 'INVALID' });
