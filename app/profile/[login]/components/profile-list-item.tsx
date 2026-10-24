import type { ComponentType, FC, ReactNode } from 'react';

import { Link } from '@/components/link/link';

type ProfileListItemProps = {
  value?: ReactNode;
  /** A site path (`/country/…`) opens in place; anything else opens in a new tab. */
  url?: string;
  /** Shown before the value, outside its link: a flag. */
  prefix?: ReactNode;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

export const ProfileListItem: FC<ProfileListItemProps> = ({ value, url, prefix, Icon }) => {
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

  // Long addresses and handles wrap anywhere; words in plain text keep together.
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        {prefix}
        {getValue()}
      </span>
    </div>
  );
};
