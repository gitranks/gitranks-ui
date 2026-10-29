/**
 * Why a Contribute call failed, as the pages tell it:
 * - `SIGNED_OUT`: no session, or one that needs a new sign-in.
 * - `NOT_FOUND`: the API hides Contribute from this user (off the preview list).
 * - `NOT_AVAILABLE_YET`: the API does not know the operation or field yet.
 * - `INVALID`: the API refused the input, with its own message.
 * - `FAILED`: anything else.
 */
export type ContributeErrorCode = 'SIGNED_OUT' | 'NOT_FOUND' | 'NOT_AVAILABLE_YET' | 'INVALID' | 'FAILED';

export type ContributeActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ContributeErrorCode; message?: string };

type GraphqlError = { message?: string; extensions?: { code?: string } };

/** GraphQL errors as `lib/graphql/request` throws them: the `errors` array as JSON in the message. */
const graphqlErrorsOf = (error: unknown): GraphqlError[] => {
  try {
    const parsed = JSON.parse((error as Error)?.message ?? '');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const UNKNOWN_FIELD = /Cannot query field|Unknown type|Unknown argument/i;

export function contributeErrorOf(error: unknown): { error: ContributeErrorCode; message?: string } {
  const errors = graphqlErrorsOf(error);
  const codes = errors.map(({ extensions }) => extensions?.code);

  if (codes.includes('NOT_FOUND')) return { error: 'NOT_FOUND' };
  if (codes.includes('UNAUTHENTICATED')) return { error: 'SIGNED_OUT' };
  if (codes.includes('GRAPHQL_VALIDATION_FAILED') || errors.some(({ message }) => UNKNOWN_FIELD.test(message ?? ''))) {
    return { error: 'NOT_AVAILABLE_YET' };
  }
  const invalid = errors.find(({ extensions }) =>
    ['BAD_USER_INPUT', 'BAD_REQUEST', 'CONFLICT', 'FORBIDDEN'].includes(extensions?.code ?? ''),
  );
  if (invalid) return { error: 'INVALID', message: invalid.message };
  return { error: 'FAILED' };
}

/** A failed call's message for the user. */
export function contributeErrorMessage(error: ContributeErrorCode, message?: string): string {
  switch (error) {
    case 'SIGNED_OUT':
      return 'Your session ended. Sign in again and retry.';
    case 'NOT_FOUND':
      return 'GitRanks Contribute is not open to your account yet.';
    case 'NOT_AVAILABLE_YET':
      return 'This is not available yet. It is coming soon.';
    case 'INVALID':
      return message || 'That value was not accepted. Check it and try again.';
    default:
      return 'Something went wrong. Try again in a minute.';
  }
}

/**
 * A failed Submit or Discard's message. NOT_FOUND there is the attempt, not Contribute: it was deleted, or it belongs
 * to another account.
 */
export function attemptActionErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'NOT_FOUND')
    return 'This attempt is gone, or it is no longer yours. Reload the page to see where it stands.';
  return contributeErrorMessage(error, message);
}
