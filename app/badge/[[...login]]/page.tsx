'use cache';

import { unstable_cacheLife as cacheLife, unstable_cacheTag as cacheTag } from 'next/cache';

import { Separator } from '@/components/ui/separator';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { IdByLoginDocument } from '@/types/generated/graphql';

import { BadgeForm } from './components/badge-form';
import { IntegrationCode } from './components/integration-code';
import { LoginForm } from './components/login-form';
import { Preview } from './components/preview';

export default async function Badge({ params }: { params: Promise<{ login?: string[] }> }) {
  cacheLife('hours');

  const { login } = await params;
  const githubLogin = login?.[0];
  let githubId: string | undefined;

  if (githubLogin) {
    cacheTag(`profile:${githubLogin}`);

    const data = await graphqlDirect(IdByLoginDocument, { login: githubLogin });
    githubId = data.globalRankByLogin?.githubId;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
      <div className="flex flex-col gap-6 min-w-2xs max-w-md flex-grow">
        <LoginForm githubLogin={githubLogin} githubId={githubId} />
        <Separator />
        <BadgeForm />
        <Separator />
        <IntegrationCode githubLogin={githubLogin} githubId={githubId} />
      </div>
      <Preview githubLogin={githubLogin} githubId={githubId} />
    </div>
  );
}
