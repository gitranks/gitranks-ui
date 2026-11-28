/*
 * What Build's writes from the browser get back: the API's data, or why it was not taken. A test refuses an answer
 * that came twice or after the end (`CONFLICT`), which the page answers by reading the test again.
 */

/**
 * Why a write was not taken:
 * - `SIGNED_OUT`: no session, or one that needs a new sign-in.
 * - `CONFLICT`: already answered, a run that ended, or a test that cannot start now: the page reads it again.
 * - `NOT_FOUND`: no such build, run or project.
 * - `INVALID`: not of the shape the API takes, or refused by it (a built project cannot be removed).
 * - `FAILED`: anything else, an API that does not know Build yet included.
 */
export type BuildActionError = 'SIGNED_OUT' | 'CONFLICT' | 'NOT_FOUND' | 'INVALID' | 'FAILED';

export type BuildActionResult<T> = { ok: true; data: T } | { ok: false; error: BuildActionError };

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

/** Why a call failed, as a Build page acts on it. */
export function buildErrorOf(error: unknown): BuildActionError {
  const codes = codesOf(error);
  if (codes.includes('CONFLICT')) return 'CONFLICT';
  if (codes.includes('NOT_FOUND')) return 'NOT_FOUND';
  if (codes.includes('UNAUTHENTICATED')) return 'SIGNED_OUT';
  if (codes.some((code) => code === 'BAD_USER_INPUT' || code === 'BAD_REQUEST' || code === 'FORBIDDEN')) {
    return 'INVALID';
  }
  return 'FAILED';
}

/** The HTTP status a write's route answers with for each refusal. */
export const BUILD_ACTION_STATUS: Record<BuildActionError, number> = {
  SIGNED_OUT: 401,
  CONFLICT: 409,
  NOT_FOUND: 404,
  INVALID: 400,
  FAILED: 502,
};

/** A write refused before the API is asked. */
export const invalidBuildAction = <T>(): BuildActionResult<T> => ({ ok: false, error: 'INVALID' });
