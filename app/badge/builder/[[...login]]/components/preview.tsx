'use client';

import { FC } from 'react';

import { Link } from '@/components/link/link';

import { LoginFormProps } from './login-form.types';
import { useBadgeUrl } from '../hooks/useBadgeUrl';

export const Preview: FC<LoginFormProps> = ({ githubLogin, githubId }) => {
  const url = useBadgeUrl(githubLogin, githubId);

  return (
    <div
      className={`flex flex-col gap-3 items-center justify-center bg-background border-t-2 h-[120px]`}
      style={{
        position: 'fixed',
        bottom: 0,
        width: '100%',
      }}
    >
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
