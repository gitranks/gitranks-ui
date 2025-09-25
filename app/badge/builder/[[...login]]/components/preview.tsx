'use client';

import type { FC } from 'react';

import { Link } from '@/components/link/link';
import { useBadgeUrl } from '../hooks/useBadgeUrl';
import type { LoginFormProps } from './login-form.types';

export const Preview: FC<LoginFormProps> = ({ githubLogin, githubId }) => {
  const url = useBadgeUrl(githubLogin, githubId);

  return (
    <div className="flex flex-col gap-3 items-center justify-center bg-background border-t-2 lg:rounded-sm lg:border-2 lg:sticky lg:top-4 h-[120px] fixed w-full bottom-0 lg:max-w-lg lg:bottom-auto">
      <div>
        Badge Preview
        {githubId && (
          <>
            {' '}
            for <Link href={`/profile/${githubLogin}`}>{githubLogin}</Link>
          </>
        )}
      </div>
      {url && <img src={url} alt="badge" />}
      {!githubId && <div className="italic text-muted-foreground text-sm">Choose a GitHub Profile</div>}
    </div>
  );
};
