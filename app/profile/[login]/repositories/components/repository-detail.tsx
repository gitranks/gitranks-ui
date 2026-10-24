import type { FC } from 'react';

type IconProps = { className?: string; 'aria-hidden'?: boolean };
type RepositoryDetailProps = {
  Icon: FC<IconProps>;
  value: number;
  /** What the number counts, for screen readers and as a tooltip. */
  label: string;
};

export const RepositoryDetail: FC<RepositoryDetailProps> = ({ Icon, value, label }) => (
  <div className="flex gap-1 items-center" title={label}>
    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    <span className="sr-only">{label}:</span>
    <span className="font-mono tabular-nums">{value?.toLocaleString('en-US')}</span>
  </div>
);
