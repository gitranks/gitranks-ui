import { INLINE_BADGE_HEIGHT } from './inline.consts';

export const BadgeInline = () => {
  return (
    <div
      style={{
        display: 'flex',
        fontWeight: 400,
        fontSize: 12,
        height: INLINE_BADGE_HEIGHT,
        borderRadius: 3,
        overflow: 'hidden',
        letterSpacing: '-0.015em',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#5c5c5c',
          color: 'white',
          padding: '0 4px 0 6px',
          fontSize: '0.95em',
        }}
      >
        any textT
      </span>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#2282c2',
          color: 'white',
          padding: '0 6px 0 4px',
          fontSize: '0.95em',
        }}
      >
        11,234
      </span>
    </div>
  );
};
