import DocumentNode from '@/types/typed-document-node';
import { print } from 'graphql';

export async function graphqlRequest<TData, TVariables>(
  document: DocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  const query = print(document);

  const res = await fetch(`${process.env.URI}/api/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();

  // If your API returns `{"data": ... }`, cast `json.data` to TData
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }

  return json.data as TData;
}
