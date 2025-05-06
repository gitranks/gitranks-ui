import { print } from 'graphql';

import DocumentNode from '@/types/typed-document-node';

import { request } from './request';

export async function graphqlDirect<TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  const query = print(document);

  const { data } = await request(query, variables);

  return data as TData;
}
