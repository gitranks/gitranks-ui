import { print } from 'graphql';

import { ORIGINAL_USER_AGENT_HEADER } from '@/app/app.consts';
import type DocumentNode from '@/types/typed-document-node';

const resolveGraphqlProxyUrl = () => {
  if (globalThis.window !== undefined) {
    return '/api/graphql';
  }

  if (process.env.NEXT_PUBLIC_URI) {
    return new URL('/api/graphql', process.env.NEXT_PUBLIC_URI).toString();
  }

  throw new Error('Cannot resolve GraphQL proxy URL. Set NEXT_PUBLIC_URI.');
};

const resolveOriginalUserAgent = async () => {
  if (globalThis.window !== undefined) {
    return null;
  }

  try {
    const { headers } = await import('next/headers');
    const incomingHeaders = await headers();
    return incomingHeaders.get('user-agent');
  } catch {
    return null;
  }
};

export async function graphqlClient<TData, TVariables>(
  document: DocumentNode<TData, TVariables>,
  variables?: TVariables,
  params?: RequestInit,
): Promise<TData> {
  const query = print(document);
  const url = resolveGraphqlProxyUrl();
  const originalUserAgent = await resolveOriginalUserAgent();
  const requestHeaders = new Headers(params?.headers);

  requestHeaders.set('Content-Type', 'application/json');
  if (originalUserAgent) {
    requestHeaders.set(ORIGINAL_USER_AGENT_HEADER, originalUserAgent);
  }

  const res = await fetch(url, {
    ...params,
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify({ query, variables }),
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
