import type { FC } from 'react';

import { RepoContributorsSections } from '../../../components/repo-contributors-sections';
import { buildContributorsQuestions, buildContributorsSummary } from '../../../utils/contributors-summary';
import { ProfileCard } from '@/app/profile/[login]/components/profile-card';
import { ProfileSummary } from '@/app/profile/[login]/components/profile-summary';
import { JsonLd } from '@/components/json-ld/json-ld';
import { QuestionsBlock } from '@/components/questions-block/questions-block';
import type { RepoPulseFactsRead } from '@/graphql/helpers/fetch-repo-pulse';
import type { PageRepoQuery } from '@/types/generated/graphql';

type RepoContributorsScreenProps = {
  repo: Pick<NonNullable<PageRepoQuery['repo']>, 'owner' | 'name' | 'nameWithOwner' | 'stars' | 'createdAt'>;
  pulse: RepoPulseFactsRead['pulse'];
  /** The tab's JSON-LD, but its questions' (the Questions block draws those). */
  jsonLd?: object[];
};

/**
 * A repository's Contributors tab: its summary sentence, today's analytics sections, and its questions. Without
 * analytics, today's note on the star threshold or nothing.
 */
export const RepoContributorsScreen: FC<RepoContributorsScreenProps> = ({ repo, pulse, jsonLd }) => {
  const questions = pulse ? buildContributorsQuestions(repo.nameWithOwner, pulse) : [];

  return (
    <>
      {!!jsonLd?.length && <JsonLd payloads={jsonLd} />}
      {pulse && (
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Contributors</h2>
          <ProfileSummary parts={buildContributorsSummary(repo.nameWithOwner, pulse)} />
        </div>
      )}
      <RepoContributorsSections repo={repo} pulse={pulse} />
      {questions.length > 0 && (
        <ProfileCard className="gap-3">
          <h2 className="text-base font-semibold">Questions</h2>
          <QuestionsBlock items={questions} jsonLd className="flex flex-col gap-3 text-sm" />
        </ProfileCard>
      )}
    </>
  );
};
