'use server';
import { signedFetch } from '../signed-fetch';

export async function request(
  query: string,
  variables?: Record<string, unknown>,
  params?: { revalidate?: number },
): Promise<{ data: unknown; status: number }> {
  const response = await signedFetch('/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Skip rate limit if custom header is present
      'nextjs-build-phase': String(process.env.NEXT_PHASE === 'phase-production-build'),
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: params?.revalidate },
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
