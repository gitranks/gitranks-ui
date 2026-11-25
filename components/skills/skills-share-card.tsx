import type { ReactElement } from 'react';

import { type SkillsCard, skillsCardAddressSize, skillsCardSentenceSize } from '@/lib/skills/skills-share-card';
import { CARD_COLORS, Figure, Frame } from '@/lib/social-card/card-parts';

/*
 * The picture a posted link to a Skills page shows, as the design catalogue draws it. Plain elements in the card's inline styles:
 * the server draws them as a PNG, and the design catalogue draws the same elements. Light colours only, no avatar.
 */

/** The login and the sentence, each word a flex item, so the line wraps between words as text would. */
function Sentence({ card }: Readonly<{ card: SkillsCard }>) {
  const words = card.sentence.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        fontSize: skillsCardSentenceSize(card.login),
        fontWeight: 700,
        lineHeight: 1.2,
      }}
    >
      <span style={{ color: CARD_COLORS.violet, marginRight: 16 }}>@{card.login}</span>
      {words.map((word, at) => (
        <span key={`${word}-${at}`} style={{ marginRight: 16 }}>
          {word}
        </span>
      ))}
    </div>
  );
}

/** A person's Skills picture: who they are by kind, the block's figures, and the page's address. */
export function SkillsShareCard({ card }: Readonly<{ card: SkillsCard }>): ReactElement {
  return (
    <Frame eyebrow="Skills" brand="start">
      <Sentence card={card} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Level at the bottom, so a name's label sits beside a number's. */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 80 }}>
          {card.figures.map((figure) => (
            <Figure key={figure.key} value={figure.value} label={figure.label} mono={figure.mono} />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            fontSize: skillsCardAddressSize(card.login),
            color: CARD_COLORS.muted,
          }}
        >
          {card.address}
        </div>
      </div>
    </Frame>
  );
}
