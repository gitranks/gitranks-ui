'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePostHog } from 'posthog-js/react';
import { useState } from 'react';
import { ClipLoader } from 'react-spinners';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { ProfileIdByLoginDocument } from '@/types/generated/graphql';

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
    const data = await graphqlClient(ProfileIdByLoginDocument, { login });

    const profileFound = data.globalRankByLogin?.githubId;

    posthog.capture('landingPage.search', {
      login,
      profileFound,
    });

    return router.push(`/profile/${login}`);
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
          placeholder="e.g. torvalds, gaearon, theprimeagen"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          disabled={loading}
          autoCapitalize="none"
        />
        <Button onClick={onSearch} disabled={loading} className="w-[96px]">
          {loading ? <ClipLoader loading={loading} size={16} /> : <Search className="size-4" />}
          {!loading && 'Search'}
        </Button>
      </form>
    </div>
  );
};
