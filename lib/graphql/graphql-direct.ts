import { print } from 'graphql';

import { request } from './request';
import type DocumentNode from '@/types/typed-document-node';

export const graphqlDirect = async <TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  variables?: TVariables,
  params?: { revalidate?: number },
): Promise<TData> => {
  const query = print(document);
  const { data } = await request(query, variables, params);
  return data as TData;
};
