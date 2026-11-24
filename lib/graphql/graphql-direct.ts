import { print } from 'graphql';

import type { RequestSource } from '../signed-fetch';
import { request } from './request';
import type DocumentNode from '@/types/typed-document-node';

export const graphqlDirect = async <TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  variables?: TVariables,
  params?: {
    revalidate?: number;
    source?: RequestSource;
    githubLogin?: string;
    accountEmail?: string;
    /** Stops the request at request time (the proxy's gates give up on a slow answer); the build has its own. */
    signal?: AbortSignal;
  },
): Promise<TData> => {
  const query = print(document);
  const { data } = await request(query, variables, params);
  return data as TData;
};
