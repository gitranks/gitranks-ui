import { parse } from 'graphql';

import type { LearnProject } from './paths';
import type DocumentNode from '@/types/typed-document-node';

/** The Learn card of a repository or an organisation, as everyone reads it. Read through `learnEntityCardOf`. */
export const LearnEntityCardDocument = parse(
  `query LearnEntityCard($repo: String, $org: String) {
    learnEntityCard(repo: $repo, org: $org) {
      course { slug name lessons repo org }
      repoCourses { slug name lessons repo org }
      fixes
      openIssues
    }
  }`,
) as DocumentNode<{ learnEntityCard: unknown }, LearnProject>;
