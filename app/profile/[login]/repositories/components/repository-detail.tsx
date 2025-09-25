import type { FC } from 'react';

type IconProps = { size?: number; className?: string };
type RepositoryDetailProps = {
  Icon: FC<IconProps>;
  value: number;
};

export const RepositoryDetail: FC<RepositoryDetailProps> = ({ Icon, value }) => (
  <div className="flex gap-1 items-center">
    <Icon size={16} />
    <div className="text-sm">{value?.toLocaleString('en-US')}</div>
  </div>
);
