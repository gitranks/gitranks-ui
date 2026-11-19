import { viewerEmail, viewerLogin } from './contribute.data';
import { type ContributeActionResult, contributeErrorOf } from './errors';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/** A write (a mutation) carries the session's email, so the emails the user asks for have an address; a read never. */
const isWrite = (document: DocumentNode<unknown, never>) =>
  (document as unknown as { definitions: { kind: string; operation?: string }[] }).definitions.some(
    (definition) => definition.kind === 'OperationDefinition' && definition.operation === 'mutation',
  );

export const accountEmailFor = async (document: DocumentNode<unknown, never>) =>
  isWrite(document) ? await viewerEmail() : undefined;

/** Every action runs as the session's user, never one named in its arguments. */
export async function run<TData, TVariables extends Record<string, unknown>, T>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables | undefined,
  pick: (data: TData) => T,
): Promise<ContributeActionResult<T>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const accountEmail = await accountEmailFor(document as DocumentNode<unknown, never>);
    const data = await graphqlDirect(document, variables, { source: 'client', githubLogin, accountEmail });
    return { ok: true, data: pick(data) };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}
