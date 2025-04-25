'use client';

import { Separator } from '@radix-ui/react-select';
import { FC } from 'react';

import { LoginFormProps } from './badge-generator.types';
import { LoginForm } from './login-form';

export const BadgeGenerator: FC<LoginFormProps> = ({ githubLogin, githubId }) => {
  return (
    <div className="flex">
      <div className="flex flex-col gap-4">
        <LoginForm githubLogin={githubLogin} githubId={githubId} />

        <Separator />
        <div>Step 2. Customize Badge Appearance</div>
      </div>
      <div>11</div>
    </div>
  );
};
