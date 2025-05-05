'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useState } from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { graphqlRequest } from '@/lib/graphql-request';
import { IdByLoginDocument } from '@/types/generated/graphql';

export const SearchProfile = () => {
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const posthog = usePostHog();

  const onSearch = async () => {
    if (!login) {
      return;
    }

    setLoading(true);
    const data = await graphqlRequest(IdByLoginDocument, { login });

    const profileFound = data.rankByLogin?.githubId;

    posthog.capture('landingPage.search', {
      login,
      profileFound,
    });

    if (profileFound) {
      return router.push(`/profile/${login}`);
    }

    setLoading(false);
    toast.error('User not found', {
      description:
        'Our database currently includes only users who own or have contributed to repositories with more than 5 stars.',
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
        className="flex gap-4"
      >
        <Input
          placeholder="GitHub login"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          disabled={loading}
        />
        <Button onClick={onSearch} disabled={loading} className="w-[96px]">
          {loading ? <ClipLoader loading={loading} size={16} /> : <Search className="size-4" />}
          {!loading && 'Search'}
        </Button>
      </form>
    </div>
  );
};
