import type { Metadata } from 'next';

import { Page } from '@/components/page/page';
import { graphqlRequest } from '@/lib/graphql-request';
import { ProfileForMetadataDocument, UserDocument } from '@/types/generated/graphql';

type Props = {
  params: Promise<{ login: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { login } = await params;
  const { rankByLogin } = (await graphqlRequest(ProfileForMetadataDocument, { login })) ?? {};

  if (!rankByLogin?.user) {
    return { title: 'GitHub Profile Analytics & Rankings · GitRanks' };
  }

  return {
    title: `${login} – GitHub Profile Analytics & Rankings · GitRanks`,
    openGraph: {
      images: [rankByLogin.user.avatarUrl!],
    },
  };
}

export default async function Profile({ params }: { params: Promise<{ login: string }> }) {
  const { login } = await params;
  const { user } = (await graphqlRequest(UserDocument, { login })) ?? {};

  console.log('user', user);

  return (
    <Page className="gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{login} Profile</h1>
      </div>
    </Page>
  );
}
