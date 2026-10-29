import 'server-only';

import { type RequestSource, signedFetch } from '../signed-fetch';
import { ORIGINAL_USER_AGENT_HEADER } from '@/app/app.consts';

type RequestOptions = {
  revalidate?: number;
  originalUserAgent?: string;
  source?: RequestSource;
  /** Read from the session by the caller, which must have a request scope. */
  githubLogin?: string;
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

  const response = await signedFetch(
    '/graphql',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      next: { revalidate: options?.revalidate },
    },
    options?.source,
    options?.githubLogin,
  );

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
