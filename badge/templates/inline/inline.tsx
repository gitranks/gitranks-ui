import { FC } from 'react';

import { BadgeInlineProps } from './inline.types';

export const BadgeInline: FC<BadgeInlineProps> = () => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: 2,
        color: 'white',
        backgroundColor: 'black',
        fontFamily: 'Inter',
        width: 100,
        height: 20,
        borderRadius: 4,
      }}
    >
      <div style={{ fontWeight: 400, fontSize: 11, letterSpacing: '0.5px' }}>OOO</div>
      <div style={{ fontWeight: 600, fontSize: 18 }}>11,234</div>
    </div>
  );
};
