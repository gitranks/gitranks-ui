import { CodegenConfig } from '@graphql-codegen/cli';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ sub: 'codegen', typ: 'access' }, process.env.INTERNAL_JWT_SECRET!, { expiresIn: '1h' });

const config: CodegenConfig = {
  schema: {
    [`${process.env.URI_GITRANKS!}/graphql`]: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  },
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
