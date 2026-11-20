import 'server-only';

import { parse } from 'graphql';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import type { ContributeLanguage } from '@/lib/workspace/contribute.types';
import { LANGUAGES } from '@/lib/workspace/format';
import type DocumentNode from '@/types/typed-document-node';

/** The signed-in viewer's languages from their GitRanks profile, as the pool names them: strongest first, at most 3. */
export const ContributeFlowLanguagesDocument = parse(
  'query ContributeFlowLanguages { contributeProfileLanguages }',
) as DocumentNode<{ contributeProfileLanguages: ContributeLanguage[] | null }>;

/**
 * The languages What you work on pre-ticks for a signed-in person with nothing saved: read on their own, so a failed
 * read (or an API without the field) pre-ticks nothing. None signed out, without a question.
 */
export async function loadFlowProfileLanguages(): Promise<ContributeLanguage[]> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return [];
  try {
    const { contributeProfileLanguages } = await graphqlDirect(ContributeFlowLanguagesDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return (contributeProfileLanguages ?? []).filter((language) => Object.hasOwn(LANGUAGES, language));
  } catch {
    return [];
  }
}
