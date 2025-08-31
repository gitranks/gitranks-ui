import LinkNext from 'next/link';

import { Link } from '@/components/link/link';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSummaryQuery } from '@/types/generated/graphql';

import { DEFAULT_LANGUAGE_COLOR } from '../app.consts';

export const LanguageRankingLink = ({
  languageSummaries,
}: {
  languageSummaries: LanguageSummaryQuery['languageSummary'];
}) => {
  return (
    <Card className="flex-grow gap-4">
      <CardContent className="flex flex-col grow gap-4">
        <div className="grid grid-cols-3 gap-1 grow">
          {languageSummaries.slice(2).map(({ language, languageData }) => {
            return (
              <LinkNext key={language} href={`/language/${language}/global/1`} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: languageData?.color ?? DEFAULT_LANGUAGE_COLOR }}
                />
                {language}
              </LinkNext>
            );
          })}
        </div>
        <div className="flex items-center justify-end">
          <Link href="/languages/global/score/1">Browse All Languages</Link>
        </div>
      </CardContent>
    </Card>
  );
};
