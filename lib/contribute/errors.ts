/**
 * Why a Contribute call failed, as the pages tell it:
 * - `SIGNED_OUT`: no session, or one that needs a new sign-in.
 * - `NOT_FOUND`: the API hides Contribute from this user (off the preview list).
 * - `NOT_AVAILABLE_YET`: the API does not know the operation or field yet.
 * - `INVALID`: the API refused the input, with its own message.
 * - `ISSUE_TAKEN`: the issue is no longer free: a contributor (or the user's own agent) is on it.
 * - `EXPIRED`: an agent's sign-in that expired, or was used already.
 * - `FAILED`: anything else.
 */
export type ContributeErrorCode =
  | 'SIGNED_OUT'
  | 'NOT_FOUND'
  | 'NOT_AVAILABLE_YET'
  | 'INVALID'
  | 'ISSUE_TAKEN'
  | 'EXPIRED'
  | 'FAILED';

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
  if (codes.includes('ISSUE_TAKEN')) return { error: 'ISSUE_TAKEN' };
  if (codes.includes('EXPIRED')) return { error: 'EXPIRED' };
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
    case 'ISSUE_TAKEN':
      return 'Another contributor is on this issue now.';
    case 'EXPIRED':
      return 'This sign-in has expired. Start again from your agent.';
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
 * A failed "Try again" or "Work on it anyway". The stop was tried again already, or can't be: reload to see the new
 * run. The issue closed since the no-go: the API's own words say so. Anything else as the other attempt calls.
 */
export function retryErrorMessage(error: ContributeErrorCode, message?: string): string {
  if (error === 'INVALID' && /tried again already|can't be tried again/i.test(message ?? ''))
    return 'It was tried again already, or it can no longer be. Reload the page.';
  return attemptActionErrorMessage(error, message);
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
 * Why a setting on "Your repos" was not saved:
 * - `IN_FILE`: the repo's `.github/gitranks.yml` sets the key, and the file wins.
 * - `NOT_MAINTAINER`: GitHub says the account does not administer or maintain the repo (now), or cannot see it.
 * - `INVALID`: a value outside the key's values.
 * - `SIGNED_OUT`, `GITHUB_UNAVAILABLE`, `NOT_AVAILABLE_YET`, `FAILED` as for the maintainers page.
 * `IN_FILE` and `INVALID` carry the API's words (its check of the value, naming the key and its values); every other
 * code is told in ours: those are about a call that carried a token.
 */
export type MaintainerConfigErrorCode =
  | 'IN_FILE'
  | 'NOT_MAINTAINER'
  | 'INVALID'
  | 'SIGNED_OUT'
  | 'GITHUB_UNAVAILABLE'
  | 'NOT_AVAILABLE_YET'
  | 'FAILED';

export type MaintainerConfigError = { error: MaintainerConfigErrorCode; message?: string };

/** The API's words for a value it refused, when they are short and carry no `secret` (the call's token). */
const validationWordsOf = (message: string | undefined, secret?: string) => {
  const words = message?.trim();
  if (!words || words.length > 300 || (secret && words.includes(secret))) return undefined;
  return words;
};

export function maintainerConfigErrorOf(error: unknown, secret?: string): MaintainerConfigError {
  const errors = graphqlErrorsOf(error);
  const of = (code: string) => errors.find(({ extensions }) => extensions?.code === code);
  const withWords = (code: MaintainerConfigErrorCode, found: GraphqlError | undefined): MaintainerConfigError => {
    const message = validationWordsOf(found?.message, secret);
    return message ? { error: code, message } : { error: code };
  };
  if (of('CONFLICT')) return withWords('IN_FILE', of('CONFLICT'));
  if (of('FORBIDDEN') || of('NOT_FOUND')) return { error: 'NOT_MAINTAINER' };
  if (of('BAD_USER_INPUT')) return withWords('INVALID', of('BAD_USER_INPUT'));
  return { error: maintainerErrorOf(error) };
}

/** A setting not saved, in words: the API's own for a refused value, ours for the rest. */
export function maintainerConfigErrorMessage(error: MaintainerConfigErrorCode, message?: string): string {
  if ((error === 'IN_FILE' || error === 'INVALID') && message) {
    return `Not saved: ${message.charAt(0).toLowerCase()}${message.slice(1)}${/[.!?]$/.test(message) ? '' : '.'}`;
  }
  switch (error) {
    case 'IN_FILE':
      return 'Not saved: .github/gitranks.yml sets this, and the file wins. Change it there.';
    case 'NOT_MAINTAINER':
      return 'Not saved: GitHub says your account does not administer or maintain this repo.';
    case 'INVALID':
      return 'Not saved: that value is not one this setting takes.';
    case 'SIGNED_OUT':
      return 'Not saved: GitHub did not accept your sign-in. Sign in again, then change it.';
    case 'GITHUB_UNAVAILABLE':
      return 'Not saved: GitHub did not answer. Try again in a minute.';
    case 'NOT_AVAILABLE_YET':
      return 'Not saved: settings here are not available yet. Use .github/gitranks.yml meanwhile.';
    default:
      return 'Not saved: something went wrong. Try again in a minute.';
  }
}

/**
 * Why a note on one of our PRs, its Undo or its PR's lookup failed (the maintainers page's report flows):
 * - `SIGNED_OUT`: no GitHub sign-in for the page, or GitHub refused its token.
 * - `NOT_OURS`: the PR is not one we opened.
 * - `OWN_PR`: the visitor is the PR's own contributor.
 * - `RATE_LIMITED`: the day's notes are used up.
 * - `FORBIDDEN`: only a maintainer of the repo can do that.
 * - `GITHUB_UNAVAILABLE`: GitHub could not be read, so nothing was sent: try again.
 * - `INVALID`, `NOT_AVAILABLE_YET`, `FAILED` as elsewhere; FAILED may be tried again.
 * Never the API's own words: they are about a call that carried a token.
 */
export type PrFeedbackErrorCode =
  | 'SIGNED_OUT'
  | 'NOT_OURS'
  | 'OWN_PR'
  | 'RATE_LIMITED'
  | 'FORBIDDEN'
  | 'GITHUB_UNAVAILABLE'
  | 'INVALID'
  | 'NOT_AVAILABLE_YET'
  | 'FAILED';

export function prFeedbackErrorOf(error: unknown): PrFeedbackErrorCode {
  const errors = graphqlErrorsOf(error);
  const codes = errors.map(({ extensions }) => extensions?.code);

  if (codes.includes('UNAUTHENTICATED')) return 'SIGNED_OUT';
  if (codes.includes('NOT_FOUND')) return 'NOT_OURS';
  if (codes.includes('CONFLICT')) return 'OWN_PR';
  if (codes.includes('RATE_LIMITED')) return 'RATE_LIMITED';
  if (codes.includes('FORBIDDEN')) return 'FORBIDDEN';
  if (codes.includes('SERVICE_UNAVAILABLE') || codes.includes('GITHUB_UNAVAILABLE')) return 'GITHUB_UNAVAILABLE';
  if (codes.includes('GRAPHQL_VALIDATION_FAILED') || errors.some(({ message }) => UNKNOWN_FIELD.test(message ?? ''))) {
    return 'NOT_AVAILABLE_YET';
  }
  if (codes.includes('BAD_USER_INPUT')) return 'INVALID';
  return 'FAILED';
}

/**
 * The words for a failed note (`send`), Undo (`undo`) or the PR's lookup (`read`). A send that broke off may have gone
 * through, so its words never say it did not: another send only adds to the same note.
 */
export function prFeedbackErrorMessage(error: PrFeedbackErrorCode, doing: 'send' | 'undo' | 'read' = 'send'): string {
  if (error === 'GITHUB_UNAVAILABLE' || error === 'FAILED') {
    if (doing === 'send') return "We couldn't finish sending this. Try again; if it went through, we'll merge the two.";
    if (doing === 'undo') return "We couldn't finish this. Try again in a minute.";
    return error === 'GITHUB_UNAVAILABLE'
      ? 'GitHub did not answer, so we could not check this pull request. Try again in a minute.'
      : 'Something went wrong while reading this pull request. Try again in a minute.';
  }
  switch (error) {
    case 'SIGNED_OUT':
      return 'GitHub did not accept your sign-in. Sign in again, then send it.';
    case 'NOT_OURS':
      return "We didn't open this PR. Only PRs with our footer can be reported here; write to hello@gitranks.com about anything else.";
    case 'OWN_PR':
      return 'This is your own pull request: notes on it come from other people.';
    case 'RATE_LIMITED':
      return 'You have sent the most notes we take in a day. Try again tomorrow, or write to hello@gitranks.com.';
    case 'FORBIDDEN':
      return 'GitHub says your account does not maintain this repo now, so this can’t be undone from it.';
    case 'INVALID':
      return 'Something in the form was not accepted. Check it and send again.';
    case 'NOT_AVAILABLE_YET':
      return 'This is not available yet. Write to hello@gitranks.com with the PR link meanwhile.';
    default:
      return 'Something went wrong. Try again in a minute.';
  }
}

/** A failure worth another try as it is: GitHub or the service did not answer. */
export const isRetryablePrFeedbackError = (error: PrFeedbackErrorCode) =>
  error === 'GITHUB_UNAVAILABLE' || error === 'FAILED';

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
