import type { FC } from 'react';

import { MoreLink } from '@/app/profile/[login]/components/profile-card';

type RepoRankingHeaderProps = {
  title: string;
  /** The other lists: the languages, or every repository. */
  link: { href: string; label: string };
};

export const RepoRankingHeader: FC<RepoRankingHeaderProps> = ({ title, link }) => (
  <div className="flex items-center justify-between gap-4 flex-wrap">
    <h1 className="text-2xl font-semibold">{title}</h1>
    <MoreLink href={link.href}>{link.label}</MoreLink>
  </div>
);

export const ALL_REPOS_LINK = { href: '/repos/1', label: 'All repositories' };
export const REPO_LANGUAGES_LINK = { href: '/repos/languages', label: 'By language' };
