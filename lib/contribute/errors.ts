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

/**
 * Why a maintainers page call failed:
 * - `SIGNED_OUT`: no GitHub sign-in for the page, or GitHub refused its token.
 * - `GITHUB_UNAVAILABLE`: GitHub did not answer for the token, or rate-limited it.
 * - `NOT_AVAILABLE_YET`: the API does not know the operation yet.
 * - `FAILED`: anything else.
 * Never the API's own words: they are about a call that carried a token.
 */
export type MaintainerErrorCode = 'SIGNED_OUT' | 'GITHUB_UNAVAILABLE' | 'NOT_AVAILABLE_YET' | 'FAILED';

export function maintainerErrorOf(error: unknown): MaintainerErrorCode {
  const errors = graphqlErrorsOf(error);
  const codes = errors.map(({ extensions }) => extensions?.code);

  if (codes.includes('UNAUTHENTICATED')) return 'SIGNED_OUT';
  if (codes.includes('SERVICE_UNAVAILABLE')) return 'GITHUB_UNAVAILABLE';
  if (codes.includes('GRAPHQL_VALIDATION_FAILED') || errors.some(({ message }) => UNKNOWN_FIELD.test(message ?? ''))) {
    return 'NOT_AVAILABLE_YET';
  }
  return 'FAILED';
}

/** A failed maintainers page call's message. */
export function maintainerErrorMessage(error: MaintainerErrorCode): string {
  switch (error) {
    case 'SIGNED_OUT':
      return 'GitHub did not accept your sign-in. Sign in again to see your repos.';
    case 'GITHUB_UNAVAILABLE':
      return 'GitHub did not answer. Try again in a minute.';
    case 'NOT_AVAILABLE_YET':
      return 'Opting out with your GitHub account is not available yet. Add .github/gitranks.yml to your repo instead.';
    default:
      return 'Something went wrong. Try again in a minute.';
  }
}

/**
 * Why a call about what the user works on (the mode, the lists, the ignored repos, feedback) failed: the Contribute
 * codes, and
 * - `RATE_LIMITED`: a day's limit is reached, or GitHub asked us to slow down.
 * - `GITHUB_UNAVAILABLE`: GitHub could not be read.
 * - `LIST_FULL`: the ignored repos are at their cap.
 * - `CONFLICT`: the lists changed meanwhile.
 * - `UNAVAILABLE`: the service is down for a moment.
 */
export type ContributeSetErrorCode =
  | ContributeErrorCode
  | 'RATE_LIMITED'
  | 'GITHUB_UNAVAILABLE'
  | 'LIST_FULL'
  | 'CONFLICT'
  | 'UNAVAILABLE';

export type ContributeSetActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ContributeSetErrorCode; message?: string };

const SET_CODES: Record<string, ContributeSetErrorCode> = {
  RATE_LIMITED: 'RATE_LIMITED',
  GITHUB_UNAVAILABLE: 'GITHUB_UNAVAILABLE',
  LIST_FULL: 'LIST_FULL',
  CONFLICT: 'CONFLICT',
  SERVICE_UNAVAILABLE: 'UNAVAILABLE',
};

export function contributeSetErrorOf(error: unknown): { error: ContributeSetErrorCode; message?: string } {
  const codes = graphqlErrorsOf(error).map(({ extensions }) => extensions?.code ?? '');
  const own = codes.find((code) => code in SET_CODES);
  if (own) return { error: SET_CODES[own] };
  return contributeErrorOf(error);
}

/** What the failed call was doing, so its message can say it. */
export type ContributeSetAction = 'add' | 'ignore' | 'resolve' | 'feedback' | 'change';

/** A failed call's message for the user, about what the user works on. */
export function contributeSetErrorMessage(
  error: ContributeSetErrorCode,
  action: ContributeSetAction,
  limits?: { addsPerDay?: number; resolvesPerDay?: number; feedbackPerDay?: number; ignore?: number },
  message?: string,
): string {
  switch (error) {
    case 'RATE_LIMITED':
      if (action === 'add') {
        return `Too many adds for now. You can add ${limits?.addsPerDay ?? 60} times a day, and GitHub sometimes asks us to slow down. Try again later.`;
      }
      if (action === 'resolve') {
        return `You can refresh your libraries ${limits?.resolvesPerDay ?? 10} times a day. Try again tomorrow.`;
      }
      if (action === 'feedback') {
        return `You can send ${limits?.feedbackPerDay ?? 10} messages a day. Try again tomorrow.`;
      }
      return 'Too many changes for now. Try again in a minute.';
    case 'GITHUB_UNAVAILABLE':
      return "GitHub didn't answer. Try again in a minute.";
    case 'LIST_FULL':
      return `Your ignore list is full (${limits?.ignore ?? 50}): unignore a repo first.`;
    case 'CONFLICT':
      return 'Your lists changed meanwhile. Reload the page and try again.';
    case 'UNAVAILABLE':
      return 'This is down for a moment. Try again in a minute.';
    case 'NOT_FOUND':
      if (action === 'add') return 'GitHub has no user, org or repo by that name.';
      if (action === 'ignore') return 'That repo is no longer on your lists. Reload the page to see them.';
      return contributeErrorMessage(error, message);
    case 'INVALID':
      if (action === 'add') return 'Enter a repo (owner/name), a GitHub link, a user or an org.';
      return contributeErrorMessage(error, message);
    default:
      return contributeErrorMessage(error, message);
  }
}
