import type { ComponentType, FC } from 'react';

import { Link } from '@/components/link/link';

type ProfileListItemProps = {
  value?: string | number | null;
  /** A site path (`/country/…`) opens in place; anything else opens in a new tab. */
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

    if (url.startsWith('/')) {
      return <Link href={url}>{value}</Link>;
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
