'use server';

import { type RequestSource, signedFetch } from '../signed-fetch';
import { ORIGINAL_USER_AGENT_HEADER } from '@/app/app.consts';

type RequestOptions = {
  revalidate?: number;
  originalUserAgent?: string;
  source?: RequestSource;
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
  );

  if (!response.ok) {
    throw new Error(`GraphQL error! ${response.status}: ${response.statusText}`);
  }

  const res = await response.json();

  if (res.errors) {
    throw new Error(JSON.stringify(res.errors));
  }

  return { data: res.data, status: response.status };
}
