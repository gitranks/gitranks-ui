import { Page } from '@/components/page/page';
import { graphqlRequest } from '@/lib/graphql-request';
import { IdByLoginDocument } from '@/types/generated/graphql';

import { BadgeGenerator } from './badge-generator';

export default async function Badge({ params }: { params: Promise<{ login?: string[] }> }) {
  const { login } = await params;
  const githubLogin = login?.[0];
  let githubId: string | undefined;

  if (githubLogin) {
    const data = await graphqlRequest(IdByLoginDocument, { login: githubLogin });
    githubId = data.rankByLogin?.githubId;
    console.log('data', data.rankByLogin?.githubId);
  }

  return (
    <Page>
      <div>
        <h1 className="text-2xl font-semibold">Profile badge</h1>
        <div>Create a custom profile badge to showcase on your GitHub portfolio or anywhere you like!</div>
      </div>

      <BadgeGenerator githubLogin={githubLogin} githubId={githubId} />
    </Page>
  );
}
