'use client';

import { FC } from 'react';

import { LoginFormProps } from './login-form.types';
import { useBadgeUrl } from '../hooks/useBadgeUrl';

export const Preview: FC<LoginFormProps> = ({ githubLogin, githubId }) => {
  const url = useBadgeUrl(githubLogin, githubId);

  return (
    <div className="flex flex-grow items-start justify-center">
      <div className="flex flex-col max-w-lg min-w-xs border-1 rounded-lg p-6 gap-3">
        <p className="text-xs">devwizard/README.md</p>
        <p className="text-lg font-semibold">Hi, I&apos;m devwizard 👋</p>
        <p>
          I&apos;m a full-stack developer with a passion for building open-source tools and learning new tech every day.
        </p>
        {url && (
          <div className="py-2">
            <img src={url} alt="badge" />
          </div>
        )}
        <p className="text-lg font-semibold">Tech Stack 🧰</p>
        <ul className="list-disc pl-4">
          <li>JavaScript / TypeScript</li>
          <li>Node.js / NestJS</li>
          <li>React / Next.js</li>
          <li>MongoDB / PostgreSQL</li>
          <li>Docker / GitHub Actions</li>
        </ul>
      </div>
    </div>
  );
};
