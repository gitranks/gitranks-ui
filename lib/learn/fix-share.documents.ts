import { parse } from 'graphql';

import type { LearnFixCard } from './fix-share-card';
import type DocumentNode from '@/types/typed-document-node';

/** A fix as its public pages read it, the parts its picture draws; null for a pull request with no public page. */
export const LearnFixCardDocument = parse(
  `query LearnFixCard($ref: LearnFixRef!) {
    learnFix(ref: $ref) {
      repo issueNumber number state made fixer
      lesson { slug title course courseName }
      title agent mergedAt
    }
  }`,
) as DocumentNode<{ learnFix: LearnFixCard | null }, { ref: { owner: string; repo: string; number: number } }>;
