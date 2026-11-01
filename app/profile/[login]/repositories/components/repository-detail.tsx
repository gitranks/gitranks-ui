import type { FC, ReactNode } from 'react';

type IconProps = { className?: string; 'aria-hidden'?: boolean };
type RepositoryDetailProps = {
  Icon: FC<IconProps>;
  value: number;
  /** What the number counts, for screen readers and as a tooltip. */
  label: string;
  /** Drawn in place of `value`, when the number needs more than a plain count (its own hover, no tooltip). */
  children?: ReactNode;
};

export const RepositoryDetail: FC<RepositoryDetailProps> = ({ Icon, value, label, children }) => (
  <div className="flex gap-1 items-center" title={children ? undefined : label}>
    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    <span className="sr-only">{label}:</span>
    {children ?? <span className="font-mono tabular-nums">{value?.toLocaleString('en-US')}</span>}
  </div>
);
