import { print } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

export async function graphqlClient<TData, TVariables>(
  document: DocumentNode<TData, TVariables>,
  variables?: TVariables,
  params?: RequestInit,
): Promise<TData> {
  const query = print(document);

  const res = await fetch(`${process.env.NEXT_PUBLIC_URI}/api/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    ...params,
  });

  const json = await res.json();

  return json as TData;
}
