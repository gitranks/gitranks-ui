import { parse } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

/**
 * Package pages' operations, written out here rather than in `.gql` files: the fields are newer than the generated
 * schema, and an API that does not answer them yet fails only these operations.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/**
 * Whether package pages are shown: `everyone` once they are open to all visitors, `viewer` for the signed-in person the
 * call names when they may see them.
 */
export const PackagesGateDocument = doc<{ packagesGate: { everyone: boolean; viewer: boolean } | null }>(
  'query PackagesGate { packagesGate { everyone viewer } }',
);
