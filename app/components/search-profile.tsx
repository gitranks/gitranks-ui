'use client';

import { Search } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ClipLoader } from 'react-spinners';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { isGithubLogin, isRepoSlug } from '@/lib/routing/ranking-routes';
import { OrgIdByLoginDocument } from '@/types/generated/graphql';
import { getRepoPath } from '@/utils/repo-paths';

const INVALID_QUERY = 'Enter a GitHub user, organization, or owner/repo';

/**
 * The login or `owner/name` a search names: spaces, a pasted github.com URL (with its query or hash) and a leading
 * `@` are dropped; segments past the second (`/issues/1`) are ignored.
 */
function parseQuery(query: string) {
  const [owner = '', name] = query
    .replace(/\s+/g, '')
    .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')
    .replace(/[?#].*$/, '')
    .replace(/^@/, '')
    .split('/')
    .filter(Boolean);

  return { owner, name };
}

export const SearchProfile = () => {
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setLoading(false);
    setLogin('');
  }, []);

  const onSearch = async () => {
    const { owner, name } = parseQuery(login);
    if (!owner) {
      return;
    }

    const valid = name ? isRepoSlug(owner, name) : isGithubLogin(owner);
    if (!valid) {
      inputRef.current?.setCustomValidity(INVALID_QUERY);
      inputRef.current?.reportValidity();
      return;
    }

    setLoading(true);

    if (name) {
      return router.push(getRepoPath(`${owner}/${name}`));
    }

    try {
      const data = await graphqlClient(OrgIdByLoginDocument, { login: owner });
      if (data.organization?.githubId) {
        return router.push(`/org/${owner}` as Route);
      }
    } catch {
      // The profile page answers for users and 404s for unknown logins, so it is the fallback.
    }

    return router.push(`/profile/${owner}`);
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
        GitHub user, organization, or repository
      </label>
      <Input
        ref={inputRef}
        id="landing-search"
        placeholder="torvalds, vercel, or facebook/react"
        value={login}
        onChange={(event) => {
          event.target.setCustomValidity('');
          setLogin(event.target.value);
        }}
        disabled={loading}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        className="h-10 min-w-0"
      />
      <Button type="submit" size="lg" disabled={loading} className="min-w-36">
        {loading ? <ClipLoader loading={loading} size={16} color="currentColor" /> : <Search className="size-4" />}
        Search
      </Button>
    </form>
  );
};
