import { print } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

const resolveGraphqlProxyUrl = () => {
  if (typeof window !== 'undefined') {
    return '/api/graphql';
  }

  if (process.env.NEXT_PUBLIC_URI) {
    return new URL('/api/graphql', process.env.NEXT_PUBLIC_URI).toString();
  }

  throw new Error('Cannot resolve GraphQL proxy URL. Set NEXT_PUBLIC_URI.');
};

export async function graphqlClient<TData, TVariables>(
  document: DocumentNode<TData, TVariables>,
  variables?: TVariables,
  params?: RequestInit,
): Promise<TData> {
  const query = print(document);
  const url = resolveGraphqlProxyUrl();

  console.log('graphql client fetch', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    ...params,
  });

  const rawBody = await res.text();
  const contentType = res.headers.get('content-type') ?? '';

  if (!res.ok) {
    throw new Error(`GraphQL proxy request failed (${res.status} ${res.statusText}) for ${url}`);
  }

  if (!contentType.includes('application/json')) {
    throw new Error(
      `Expected JSON from ${url}, got "${contentType || 'unknown'}". Response starts with: ${rawBody.slice(0, 120)}`,
    );
  }

  const json = JSON.parse(rawBody);

  return json as TData;
}
