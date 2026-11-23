/*
 * What Learn's answers from the browser get back: the API's data, or why it was not taken. The review and the check
 * refuse an answer that came twice or too late (`CONFLICT`), which the page answers by reading again, not by asking
 * the person to send it once more.
 */

/**
 * Why an answer was not taken:
 * - `SIGNED_OUT`: no session, or one that needs a new sign-in.
 * - `CONFLICT`: already answered, not due now, or a check that ended: the page reads its state again.
 * - `NOT_FOUND`: no such course, or no check offered for it.
 * - `INVALID`: not of the shape the API takes.
 * - `FAILED`: anything else.
 */
export type LearnActionError = 'SIGNED_OUT' | 'CONFLICT' | 'NOT_FOUND' | 'INVALID' | 'FAILED';

export type LearnActionResult<T> = { ok: true; data: T } | { ok: false; error: LearnActionError };

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

/** Why a call failed, as a Learn page acts on it. */
export function learnErrorOf(error: unknown): LearnActionError {
  const codes = codesOf(error);
  if (codes.includes('CONFLICT')) return 'CONFLICT';
  if (codes.includes('NOT_FOUND')) return 'NOT_FOUND';
  if (codes.includes('UNAUTHENTICATED')) return 'SIGNED_OUT';
  if (codes.some((code) => code === 'BAD_USER_INPUT' || code === 'BAD_REQUEST')) return 'INVALID';
  return 'FAILED';
}

/** An answer refused before the API is asked. */
export const invalidAnswer = <T>(): LearnActionResult<T> => ({ ok: false, error: 'INVALID' });
