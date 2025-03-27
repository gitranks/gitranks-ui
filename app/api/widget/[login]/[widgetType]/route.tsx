import { graphqlRequest } from '@/lib/graphql-request';
import { RankByLoginDocument, RankByLoginQuery } from '@/types/generated/graphql';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import satori, { SatoriOptions } from 'satori';
import path from 'path';
import { promises as fs } from 'fs';
import { emojiMapping } from '@/utils/emoji-mapping';
import { Follower, PullRequest, Star } from '@/components/icons';
import { figmaVariables } from '@/utils/figma-variables-mapping';

type WidgetType = 'stars' | 'contributions' | 'followers';
type Props = {
  params: Promise<{ login: string; widgetType: WidgetType }>;
};

async function loadFont(fontWeight: string): Promise<Buffer> {
  return fs.readFile(path.join(process.cwd(), 'public', 'fonts', `Inter-${fontWeight}.ttf`));
}

const [regularFontFile, boldFontFile, semiBoldFontFile] = await Promise.all([
  loadFont('Regular'),
  loadFont('Bold'),
  loadFont('SemiBold'),
]);

const options: SatoriOptions = {
  width: 200,
  height: 52,
  embedFont: true,
  fonts: [
    { name: 'Inter', data: regularFontFile, weight: 400, style: 'normal' },
    { name: 'Inter', data: semiBoldFontFile, weight: 600, style: 'normal' },
    { name: 'Inter', data: boldFontFile, weight: 700, style: 'normal' },
  ],
  loadAdditionalAsset: async (_, segment: string) => emojiMapping[segment] || '',
};

const getRank = (
  data: RankByLoginQuery['rankByLogin'],
  widgetType: WidgetType,
): { rank?: number; delta?: number; sentiment?: 'positive' | 'negative' } => {
  let rank;
  let monthlyRank;

  if (!data) {
    return { rank: undefined, delta: undefined, sentiment: undefined };
  }

  switch (widgetType) {
    case 'stars':
      rank = data.ownedStars;
      monthlyRank = data.ownedStarsM;
      break;
    case 'contributions':
      rank = data.contributedStars;
      monthlyRank = data.contributedStarsM;
      break;
    case 'followers':
      rank = data.followersCount;
      monthlyRank = data.followersCountM;
      break;
  }

  const delta = rank - (monthlyRank ?? rank);

  return { rank, delta: Math.abs(delta), sentiment: delta > 0 ? 'positive' : 'negative' };
};

const getWidgetIcon = (widgetType: WidgetType) => {
  switch (widgetType) {
    case 'stars':
      return Star;
    case 'contributions':
      return PullRequest;
    case 'followers':
      return Follower;
  }
};

export async function GET(req: NextRequest, { params }: Props) {
  const theme = 'light';
  const { colors } = figmaVariables[theme];
  const { login, widgetType } = await params;

  const { rankByLogin } = await graphqlRequest(RankByLoginDocument, { login });

  if (!rankByLogin) {
    return redirect('/404');
  }

  const { rank, delta, sentiment } = getRank(rankByLogin, widgetType);

  if (!rank || !sentiment) {
    return redirect('/404');
  }

  const Icon = getWidgetIcon(widgetType);

  const svg = await satori(
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: 8,
        color: colors.text.primary,
        backgroundColor: colors.surface.primary,
        fontFamily: 'Inter',
        width: 200,
        height: 52,
        borderRadius: 8,
      }}
    >
      <Icon width={32} height={32} />

      <div
        style={{
          display: 'flex',
          flexGrow: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 400, fontSize: 10, letterSpacing: '0.5px' }}>GITHUB RANK</div>
        <div style={{ fontWeight: 600, fontSize: 18 }}>{rank.toLocaleString('en-US')}</div>
      </div>

      {!!delta && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            fontWeight: 400,
            fontSize: 8,
            color: colors.text[sentiment],
          }}
        >
          {sentiment === 'positive' && '▲'}
          <div style={{ fontWeight: 700, fontSize: 12 }}>{delta.toLocaleString('en-US')}</div>
          {sentiment === 'negative' && '▼'}
        </div>
      )}

      {/* {!!user?.avatarUrl && <img src={user?.avatarUrl} width={100} height={100} alt="user avatar" />} */}
    </div>,
    options,
  );

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'max-age=300, public', // Cache badge for 5 minutes
    },
  });
}
