'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { BadgeForm } from './components/badge-form';
import { IntegrationCode } from './components/integration-code';
import { LoginForm } from './components/login-form';
import { Preview } from './components/preview';
import { isRankedIn } from '@/badge/utils/is-ranked-in';
import { Separator } from '@/components/ui/separator';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileIdByLoginDocument } from '@/types/generated/graphql';
import { UserRankProp } from '@/types/ranking.types';

/**
 * Every `/badge/builder/<login>` renders the same tool with a prefilled login, so they
 * all point at the bare builder. robots.txt blocks the sub-paths; this is the backstop
 * for any that were already discovered.
 */
// async: the file-level `use cache` directive requires it.
export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: { canonical: '/badge/builder' },
  };
}

export default async function Badge({ params }: PageProps<'/badge/builder/[[...login]]'>) {
  cacheLife('hours');

  const { login } = await params;
  const githubLogin = login?.[0];
  let githubId: string | undefined;
  let rankedIn: UserRankProp[] | undefined;

  if (githubLogin) {
    cacheTag(`profile:${githubLogin}`);

    const data = await graphqlDirect(ProfileIdByLoginDocument, { login: githubLogin });
    githubId = data.globalRankByLogin?.githubId;

    const ranks = data.globalRankByLogin;
    const scores = ranks?.user;
    if (scores) {
      rankedIn = Object.values(UserRankProp).filter((ranking) => isRankedIn(ranking, scores, ranks));
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      <div className="flex flex-col gap-6 min-w-2xs max-w-lg lg:max-w-2xl flex-grow mb-[80px] lg:mb-0">
        <LoginForm githubLogin={githubLogin} githubId={githubId} />
        <Separator />
        <BadgeForm rankedIn={rankedIn} />
        <Separator />
        <IntegrationCode githubLogin={githubLogin} githubId={githubId} rankedIn={rankedIn} />
      </div>
      <Preview githubLogin={githubLogin} githubId={githubId} rankedIn={rankedIn} />
    </div>
  );
}
