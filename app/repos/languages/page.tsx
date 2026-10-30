'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';

import { ALL_REPOS_LINK, RepoRankingHeader } from '../components/repo-ranking-header';
import { RepoLanguageCard } from './components/repo-language-card';
import { PageGrid } from '@/components/grid/grid';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';
import { pageMetadata } from '@/lib/seo/page-metadata';

export const metadata: Metadata = pageMetadata({
  title: 'Repository Rankings by Language',
  description:
    'Programming languages by the number of ranked GitHub repositories written mainly in them, with each language’s top repository.',
  path: '/repos/languages',
});

export default async function RepoLanguagesPage() {
  cacheLife('hours');

  const languages = await fetchRepoLanguages();

  return (
    <>
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">
        <RepoRankingHeader title="Repositories by Language" link={ALL_REPOS_LINK} />
        <PageGrid>
          {languages.map((item) => (
            <RepoLanguageCard key={item.language ?? ''} data={item} />
          ))}
        </PageGrid>
      </Page>
    </>
  );
}
