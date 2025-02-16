import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: {
    [process.env.GRAPHQL_URI!]: {
      headers: {
        'x-api-key': process.env.GRAPHQL_SECRET_KEY!,
      },
    },
  },
  documents: ['**/*.gql'],
  // ignoreNoDocuments: true, // for better experience with the watcher
  generates: {
    './types/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        // Instruct Codegen to import your custom TypedDocumentNode
        documentNodeImport: '../typed-document-node',
      },
    },
    './types/generated/schema.graphql': {
      plugins: ['schema-ast'],
    },
  },
};

export default config;
