'use server';

import { ORIGINAL_USER_AGENT_HEADER } from '@/app/app.consts';

import { signedFetch } from '../signed-fetch';

type RequestOptions = {
  revalidate?: number;
  originalUserAgent?: string;
};

export async function request(
  query: string,
  variables?: Record<string, unknown>,
  options?: RequestOptions,
): Promise<{ data: unknown; status: number }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'nextjs-build-phase': String(process.env.NEXT_PHASE === 'phase-production-build'),
  };

  if (options?.originalUserAgent) {
    headers[ORIGINAL_USER_AGENT_HEADER] = options.originalUserAgent;
  }

  const response = await signedFetch('/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
    next: { revalidate: options?.revalidate },
  });

  if (!response.ok) {
    throw new Error(`GraphQL error! ${response.status}: ${response.statusText}`);
  }

  const res = await response.json();

  if (res.errors) {
    throw new Error(JSON.stringify(res.errors));
  }

  return { data: res.data, status: response.status };
}
