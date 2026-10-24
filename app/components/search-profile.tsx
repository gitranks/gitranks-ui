'use client';

import { Search } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClipLoader } from 'react-spinners';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { OrgIdByLoginDocument } from '@/types/generated/graphql';

export const SearchProfile = () => {
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setLoading(false);
    setLogin('');
  }, []);

  const onSearch = async () => {
    if (!login) {
      return;
    }

    setLoading(true);
    const data = await graphqlClient(OrgIdByLoginDocument, { login });
    const orgFound = data.organization?.githubId;

    if (orgFound) {
      return router.push(`/org/${login}` as Route);
    }

    return router.push(`/profile/${login}`);
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
      className="flex max-w-xl gap-2"
    >
      <label htmlFor="landing-search" className="sr-only">
        GitHub username or organization
      </label>
      <Input
        id="landing-search"
        placeholder="e.g. torvalds"
        value={login}
        onChange={(event) => setLogin(event.target.value)}
        disabled={loading}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        className="h-10 min-w-0"
      />
      <Button type="submit" size="lg" disabled={loading} className="min-w-36">
        {loading ? <ClipLoader loading={loading} size={16} color="currentColor" /> : <Search className="size-4" />}
        Find my rank
      </Button>
    </form>
  );
};
