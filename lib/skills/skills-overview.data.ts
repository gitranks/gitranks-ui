import 'server-only';

import { parse } from 'graphql';

import { NUMBERS } from './skills.documents';
import type { SkillsOverviewMine } from './skills-overview';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/** What the viewer's profile overview needs: where their page stands, its numbers, and which products they use. */
export const SkillsOverviewDocument = parse(`query SkillsOverview {
  skillsMine { state page { login numbers { ${NUMBERS} } } usesContribute usesLearn learnOpen }
}`) as DocumentNode<{ skillsMine: SkillsOverviewMine | null }, Record<string, never>>;

/** The viewer's view as their profile's overview reads it; null signed out, and when it cannot be read. Never kept. */
export async function loadSkillsOverview(githubLogin: string): Promise<SkillsOverviewMine | null> {
  try {
    const { skillsMine } = await graphqlDirect(SkillsOverviewDocument, {}, { source: 'client', githubLogin });
    return skillsMine ?? null;
  } catch {
    return null;
  }
}
