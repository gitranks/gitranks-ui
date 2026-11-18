import type { FC } from 'react';

const WIDTH = 240;
const HEIGHT = 40;

/** A small line of values, oldest first, drawn as plain SVG so it is in the page's HTML; nothing under two values. */
export const Sparkline: FC<{ values: readonly number[]; className?: string }> = ({ values, className }) => {
  if (values.length < 2) {
    return null;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = WIDTH / (values.length - 1);
  const path = values
    .map(
      (value, i) =>
        `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(HEIGHT - 2 - ((value - min) / span) * (HEIGHT - 4)).toFixed(1)}`,
    )
    .join(' ');

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={path} fill="none" stroke="var(--series-1)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
};
