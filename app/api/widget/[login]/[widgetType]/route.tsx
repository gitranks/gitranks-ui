import { graphqlRequest } from '@/lib/graphql-request';
import { RankByLoginDocument } from '@/types/generated/graphql';
import { redirect } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

type Props = {
  params: Promise<{
    login: string;
    widgetType: string;
  }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  const { login } = await params;

  const { rankByLogin } = await graphqlRequest(RankByLoginDocument, { login });

  console.log(rankByLogin);

  if (!rankByLogin) {
    return redirect('/404');
  }

  const { user, ownedStars } = rankByLogin;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <img src={user?.avatarUrl} width={100} height={100} />
        <div style={{ marginTop: 40 }}>{`${user?.login}: #${ownedStars} with ${user?.ownedStars} stars`}</div>
      </div>
    ),
    {
      width: 600,
      height: 300,
    },
  );
}
