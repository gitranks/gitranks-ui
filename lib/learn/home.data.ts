import 'server-only';

import { parse } from 'graphql';

import { type LearnHomeRead, learnHomeReadOf } from './home';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

const CARD = 'slug name kind covers languages lessons numbers { learners goodShare }';
const LINK = 'slug title';

const LearnHomeDocument = parse(
  `query LearnHome {
    learnHome {
      highlight
      next { ${LINK} }
      nextCourse { ${LINK} }
      due
      repeatedToday
      learnedToday
      nextReviewAt
      nextReviewLessons
      courses { course { ${CARD} } learned practised mastered known due next { ${LINK} } finishedAt }
      learned
      practised
      mastered
      otherCourses { ${CARD} }
      suggested { course { ${CARD} } reason }
    }
  }`,
) as DocumentNode<{ learnHome: unknown }>;

/**
 * The signed-in person's Learn home, read for them alone and never kept: null when Learn is not open to them, and on
 * any failure (an API without the field yet among them), which the page shows as an error, never as a crash.
 */
export async function loadLearnHome(githubLogin: string): Promise<LearnHomeRead | null> {
  try {
    const { learnHome } = await graphqlDirect(LearnHomeDocument, undefined, { source: 'ssr', githubLogin });
    return learnHomeReadOf(learnHome);
  } catch {
    return null;
  }
}
