'use client';

import { Edit, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FC, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { LoginFormProps } from './badge-generator.types';

export const LoginForm: FC<LoginFormProps> = ({ githubLogin = '', githubId }) => {
  const router = useRouter();
  const [login, setLogin] = useState(githubLogin);
  const [isDisabled, setIsDisabled] = useState(!!githubLogin && !!githubId);

  const onSearch = async () => {
    if (!login) {
      return;
    }

    router.push(`/badge/${login}`);
  };

  return (
    <div className="flex flex-col">
      <div>Step 1. Choose a GitHub Profile</div>
      <div className="flex gap-4">
        <Input
          placeholder="GitHub login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          disabled={isDisabled}
        />
        {!isDisabled && (
          <Button onClick={onSearch}>
            <Search className="size-4" />
            Search
          </Button>
        )}
        {isDisabled && (
          <Button onClick={() => setIsDisabled(false)}>
            <Edit className="size-4" />
            Edit
          </Button>
        )}
      </div>
      {githubLogin && !githubId && <div>Oops! We looked everywhere but found no trace of that GitHuber</div>}
    </div>
  );
};
