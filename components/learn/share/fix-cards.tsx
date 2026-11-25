import type { ReactElement } from 'react';

import {
  fixCardAddressOf,
  fixCardAddressSize,
  fixCardAgentOf,
  fixCardEyebrowOf,
  fixCardProjectOf,
  fixCardProjectSize,
  fixCardStatusOf,
  fixCardTitleOf,
  fixCardTitleSize,
  type LearnFixCard,
} from '@/lib/learn/fix-share-card';
import { CARD_COLORS, Frame } from '@/lib/social-card/card-parts';

/*
 * The picture a posted link to a fix shows, as the design catalogue draws it. Plain elements in the card's inline styles: the
 * server draws them as a PNG, and the design catalogue draws the same elements. Light colours only, no avatar.
 */

/** Words as flex items, so a line wraps between them as text would; `strong` ones in the ink's colour, in bold. */
function Words({ parts }: Readonly<{ parts: { text: string; strong?: boolean }[] }>) {
  const words = parts.flatMap(({ text, strong }) => text.split(' ').map((word) => ({ word, strong })));
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 28, color: CARD_COLORS.muted }}>
      {words.map(({ word, strong }, at) => (
        <span
          key={`${word}-${at}`}
          style={{ marginRight: 8, ...(strong ? { fontWeight: 600, color: CARD_COLORS.ink } : {}) }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

/**
 * A fix's picture: its state, the project and the issue, the title, "Fixed by @octocat with Claude Code", then "Merged
 * on 20 Nov 2026", with the lesson it used, or "Waiting for the project's review".
 */
export function FixShareCard({ fix }: Readonly<{ fix: LearnFixCard }>): ReactElement {
  const project = fixCardProjectOf(fix);
  const title = fixCardTitleOf(fix);
  const agent = fixCardAgentOf(fix);
  const status = fixCardStatusOf(fix);
  const address = fixCardAddressOf(fix);
  return (
    <Frame eyebrow={fixCardEyebrowOf(fix)} brand="start">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            fontSize: fixCardProjectSize(project),
          }}
        >
          {project}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: fixCardTitleSize(title),
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: -0.5,
          }}
        >
          {title}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Words
          parts={[{ text: 'Fixed by' }, { text: `@${fix.fixer}`, strong: true }, ...(agent ? [{ text: agent }] : [])]}
        />
        <Words
          parts={[
            { text: status.lesson ? `${status.text} · Uses the lesson` : status.text },
            ...(status.lesson ? [{ text: status.lesson, strong: true }] : []),
          ]}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            fontFamily: 'JetBrains Mono',
            fontWeight: 700,
            fontSize: fixCardAddressSize(address),
            color: CARD_COLORS.muted,
          }}
        >
          {address}
        </div>
      </div>
    </Frame>
  );
}
