'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';

import { BadgeForm } from './components/badge-form';
import { IntegrationCode } from './components/integration-code';
import { LoginForm } from './components/login-form';
import { Preview } from './components/preview';
import { getRankedIn, type RankedIn } from '@/badge/utils/is-ranked-in';
import { Separator } from '@/components/ui/separator';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ProfileIdByLoginDocument } from '@/types/generated/graphql';

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
  let storedLogin: string | undefined;
  let githubId: string | undefined;
  let rankedIn: RankedIn | undefined;
  let country: string | null | undefined;

  if (githubLogin) {
    cacheTag(`profile:${githubLogin}`);

    const data = await graphqlDirect(ProfileIdByLoginDocument, { login: githubLogin });
    githubId = data.globalRankByLogin?.githubId;

    const ranks = data.globalRankByLogin;
    const profile = ranks?.user;
    if (profile) {
      rankedIn = getRankedIn(profile, ranks, data.countryRankByLogin ?? null);
      country = profile.country;
      storedLogin = profile.login;
    }
  }

  // The login as GitHub spells it, so the badge and the profile it links to use the profile's canonical URL.
  const profileProps = { githubLogin: storedLogin ?? githubLogin, githubId, rankedIn, country };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      <div className="flex flex-col gap-6 min-w-2xs max-w-lg lg:max-w-2xl flex-grow mb-[80px] lg:mb-0">
        <LoginForm githubLogin={githubLogin} githubId={githubId} />
        <Separator />
        <BadgeForm rankedIn={rankedIn} country={country} />
        <Separator />
        <IntegrationCode {...profileProps} />
      </div>
      <Preview {...profileProps} />
    </div>
  );
}
