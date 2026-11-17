import { type FieldNode, type OperationDefinitionNode, parse, visit } from 'graphql';

const ALLOWED_ROOT_FIELDS = new Set(['globalRankByLogin', 'insight', 'insights', 'organization', 'user']);

/**
 * Whether the browser's query is refused: anything but the allowed root fields, written as plain fields. A fragment
 * spread or an inline fragment on the operation's root is refused too, as it could name any field of the root type.
 */
export function rejectNotAllowedGraphqlOperations(query: string): boolean {
  try {
    if (!query) {
      return true;
    }

    const ast = parse(query);

    let isRejected = false;

    visit(ast, {
      OperationDefinition(node: OperationDefinitionNode) {
        for (const selection of node.selectionSet.selections) {
          if (selection.kind !== 'Field' || !ALLOWED_ROOT_FIELDS.has(selection.name.value)) {
            isRejected = true;
          }
        }
      },
      Field(node: FieldNode) {
        // Reject introspection fields anywhere in the query
        if (node.name.value.startsWith('__')) {
          isRejected = true;
        }
      },
    });

    return isRejected;
  } catch (err) {
    console.error('Failed to parse query:', err);
    return true; // reject on any parsing error
  }
}
