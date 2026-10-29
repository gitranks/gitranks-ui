import { ContributePreviewDocument } from './contribute.documents';
import { sessionTokenOf } from './session-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** Whether the API opens Contribute to this GitHub login (the preview list); false on any failure. */
export async function contributePreviewAllowed(githubLogin: string | null | undefined): Promise<boolean> {
  if (!githubLogin) return false;
  try {
    const { contribute } = await graphqlDirect(ContributePreviewDocument, undefined, { source: 'ssr', githubLogin });
    return contribute?.previewAllowed === true;
  } catch {
    return false;
  }
}

/** Whether the request's signed-in user may see Contribute; a visitor without a session never may. */
export async function requestMaySeeContribute(req: { headers: Headers }): Promise<boolean> {
  const token = await sessionTokenOf(req);
  if (!token?.githubLogin || token.error) return false;
  return contributePreviewAllowed(token.githubLogin);
}
