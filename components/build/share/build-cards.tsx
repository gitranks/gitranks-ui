import type { ReactElement } from 'react';

import { type BuildCardWords, buildCardTitleSize } from '@/lib/build/share-card';
import { CARD_COLORS, Frame } from '@/lib/social-card/card-parts';

/*
 * Build's share pictures: a project a person built, a project, a step and Build's home, from their words
 * (`share-card.ts`). Plain elements in the card's inline styles, as Learn's and Interviews' pictures are: the server
 * draws them as PNGs and the design catalogue draws the same elements. Light colours only.
 */

/** One of Build's pictures: the logo and the label, the title and its lines, and the page's address. */
export function BuildShareCard({ words }: Readonly<{ words: BuildCardWords }>): ReactElement {
  const title = words.login ? `@${words.login} ${words.title}` : words.title;
  return (
    <Frame eyebrow={words.eyebrow} brand="start" eyebrowColor={words.built ? CARD_COLORS.positive : undefined}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontSize: buildCardTitleSize(title),
            fontWeight: 700,
            lineHeight: 1.18,
            maxWidth: 1010,
            letterSpacing: -0.5,
          }}
        >
          {words.login ? (
            <span style={{ color: CARD_COLORS.violet, marginRight: '0.25em' }}>@{words.login}</span>
          ) : null}
          <span>{words.title}</span>
        </div>
        {words.lines.map((line) => (
          <div key={line} style={{ display: 'flex', fontSize: 30, lineHeight: 1.35, color: CARD_COLORS.muted }}>
            {line}
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          fontFamily: 'JetBrains Mono',
          fontWeight: 700,
          fontSize: words.address.length > 52 ? 20 : 24,
          color: CARD_COLORS.muted,
          whiteSpace: 'nowrap',
        }}
      >
        {words.address}
      </div>
    </Frame>
  );
}
