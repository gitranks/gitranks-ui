import { parse, OperationDefinitionNode, visit, FieldNode } from 'graphql';

const ALLOWED_ROOT_FIELDS = new Set(['rankByLogin']);

export function rejectNotAllowedGraphqlOperations(query: string): boolean {
  try {
    if (!query) {
      return true;
    }

    const ast = parse(query);

    let isRejected = false;

    visit(ast, {
      OperationDefinition(node: OperationDefinitionNode) {
        if (node.selectionSet.selections) {
          for (const selection of node.selectionSet.selections) {
            if (selection.kind === 'Field' && !ALLOWED_ROOT_FIELDS.has(selection.name.value)) {
              isRejected = true;
            }
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
