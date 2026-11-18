import 'server-only';

import { type RequestSource, signedFetch } from '../signed-fetch';
import { ORIGINAL_USER_AGENT_HEADER } from '@/app/app.consts';

/** During `next build` only: a gateway answer or a network error is asked again this many times. */
export const BUILD_RETRIES = 3;

/** The wait before each retry during the build: 0.5 s, 1 s, 2 s. */
export const BUILD_RETRY_BASE_MS = 500;

const RETRIED_STATUSES = new Set([502, 503, 504]);

const isBuildPhase = () => process.env.NEXT_PHASE === 'phase-production-build';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * A prerender reads hundreds of pages in a few minutes, and one passing gateway answer would fail the whole build.
 * So during the build a 502, 503 or 504, or a network error, is asked again a bounded number of times with a short
 * backoff; the last answer (or error) stands. At request time nothing is retried: a page keeps its own fallbacks.
 */
async function withBuildRetries(send: () => Promise<Response>): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    const last = attempt >= BUILD_RETRIES;
    try {
      const response = await send();
      if (last || !RETRIED_STATUSES.has(response.status)) return response;
    } catch (error) {
      if (last) throw error;
    }
    await wait(BUILD_RETRY_BASE_MS * 2 ** attempt);
  }
}

type RequestOptions = {
  revalidate?: number;
  originalUserAgent?: string;
  source?: RequestSource;
  /** Read from the session by the caller, which must have a request scope. */
  githubLogin?: string;
  /** The same session's email, sent with `githubLogin` alone. */
  accountEmail?: string;
};

export async function request(
  query: string,
  variables?: Record<string, unknown>,
  options?: RequestOptions,
): Promise<{ data: unknown; status: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.originalUserAgent) {
    headers[ORIGINAL_USER_AGENT_HEADER] = options.originalUserAgent;
  }

  const send = () =>
    signedFetch(
      '/graphql',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
        next: { revalidate: options?.revalidate },
      },
      options?.source,
      options?.githubLogin,
      options?.accountEmail,
    );
  const response = isBuildPhase() ? await withBuildRetries(send) : await send();

  if (!response.ok) {
    // A query the API refuses (a field it does not know, a variable it cannot read) comes back as a 4xx with the
    // GraphQL errors in the body: those are thrown as for a 200, so callers can tell them apart.
    const errors = response.status >= 400 && response.status < 500 ? await graphqlErrorsOf(response) : null;
    if (errors) {
      throw new Error(JSON.stringify(errors));
    }
    throw new Error(`GraphQL error! ${response.status}: ${response.statusText}`);
  }

  const res = await response.json();

  if (res.errors) {
    throw new Error(JSON.stringify(res.errors));
  }

  return { data: res.data, status: response.status };
}

/** The `errors` of a GraphQL answer's JSON body; null when the body is not one. */
async function graphqlErrorsOf(response: Response): Promise<unknown[] | null> {
  try {
    const body = (await response.json()) as { errors?: unknown };
    return Array.isArray(body?.errors) && body.errors.length ? body.errors : null;
  } catch {
    return null;
  }
}
