import type { DocumentNode as DocumentNodeDefault } from 'graphql';

/**
 * A minimal definition for a typed DocumentNode.
 * Codegen will import and use this interface,
 * so it lines up with your helper function's generics.
 */
export default interface DocumentNode<TData = Record<string, unknown>, TVariables = Record<string, unknown>>
  extends DocumentNodeDefault {
  __apiType?: (variables: TVariables) => TData;
}
