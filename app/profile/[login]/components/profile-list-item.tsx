import { ComponentType, FC } from 'react';

import { Link } from '@/components/link/link';

type ProfileListItemProps = {
  value?: string | number | null;
  url?: string;
  Icon: ComponentType<{ size: number; className?: string }>;
};

export const ProfileListItem: FC<ProfileListItemProps> = ({ value, url, Icon }) => {
  if (!value) {
    return null;
  }

  const getValue = () => {
    if (!url) {
      return value;
    }

    return (
      <Link href={url} target="_blank" rel="noopener noreferrer">
        {value}
      </Link>
    );
  };

  return (
    <div className="flex gap-2 items-center break-all">
      <Icon size={20} className="shrink-0" />
      {getValue()}
    </div>
  );
};
