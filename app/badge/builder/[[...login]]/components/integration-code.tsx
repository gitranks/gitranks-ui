'use client';

import { FC } from 'react';

import { Textarea } from '@/components/ui/textarea';

import { LoginFormProps } from './login-form.types';
import { StepTitle } from './step-title';
import { useBadgeUrl } from '../hooks/useBadgeUrl';

export const IntegrationCode: FC<LoginFormProps> = ({ githubLogin, githubId }) => {
  const url = useBadgeUrl(githubLogin, githubId);

  return (
    <div className="flex flex-col gap-4">
      <StepTitle>Step 3. Copy the Code to Your GitHub README</StepTitle>
      <Textarea className="max-w-full break-all" readOnly value={githubId ? `<img src="${url}" />` : ''}></Textarea>
    </div>
  );
};
