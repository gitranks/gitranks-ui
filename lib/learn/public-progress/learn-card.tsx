import 'server-only';

import type { LearnRecord } from '../learn.types';
import { learnCardAddressOf, learnCardFiguresOf } from './public-progress';
import { CARD_COLORS, drawSocialCard, Figure, Frame } from '@/lib/social-card/social-card';

// A developer's Learn progress card: what a posted link to their public progress page shows. Light colours only.

/** A long login gets smaller type, so the sentence keeps to three lines. */
const sentenceSize = (login: string) => (login.length > 30 ? 46 : login.length > 18 ? 54 : 62);
/** And a smaller address, so it keeps to one line in its corner. */
const addressSize = (login: string) => (login.length > 24 ? 20 : 24);

/** The words of the sentence, each a flex item, so the line wraps between words as text would. */
function Sentence({ login }: Readonly<{ login: string }>) {
  const words = 'is learning from real open-source fixes'.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        fontSize: sentenceSize(login),
        fontWeight: 700,
        lineHeight: 1.2,
        maxWidth: 940,
      }}
    >
      <span style={{ color: CARD_COLORS.violet, marginRight: 16, wordBreak: 'break-all' }}>@{login}</span>
      {words.map((word, at) => (
        <span key={`${word}-${at}`} style={{ marginRight: 16 }}>
          {word}
        </span>
      ))}
    </div>
  );
}

function LearnCard({ login, record }: Readonly<{ login: string; record: LearnRecord }>) {
  return (
    <Frame eyebrow="Learn" brand="start">
      <Sentence login={login} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 80 }}>
          {learnCardFiguresOf(record).map((figure) => (
            <Figure key={figure.label} value={figure.value} label={figure.label} />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            fontSize: addressSize(login),
            color: CARD_COLORS.muted,
          }}
        >
          {learnCardAddressOf(login)}
        </div>
      </div>
    </Frame>
  );
}

/** The card as a PNG, for the login as GitRanks stores it. */
export function drawLearnCard(login: string, record: LearnRecord): Promise<Uint8Array<ArrayBuffer>> {
  return drawSocialCard(<LearnCard login={login} record={record} />);
}
