import type { CodegenConfig } from '@graphql-codegen/cli';
import jwt from 'jsonwebtoken';

/**
 * The schema: the API's, or a schema file when `CODEGEN_SCHEMA` names one (`CODEGEN_SCHEMA=path/to/schema.gql pnpm
 * codegen`). The plugins are pinned in package.json, so either way the generated types keep the committed style.
 */
const schemaFile = process.env.CODEGEN_SCHEMA;

const schema: CodegenConfig['schema'] = schemaFile
  ? schemaFile
  : {
      [`${process.env.URI_GITRANKS!}/graphql`]: {
        headers: {
          Authorization: `Bearer ${jwt.sign({ sub: 'codegen', typ: 'access' }, process.env.INTERNAL_JWT_SECRET!, { expiresIn: '30m' })}`,
        },
      },
    };

const config: CodegenConfig = {
  schema,
  documents: ['**/*.gql'],
  generates: {
    './types/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        documentNodeImport: '../typed-document-node',
      },
    },
    './types/generated/schema.graphql': {
      plugins: ['schema-ast'],
    },
  },
};

export default config;
