import { FC, useMemo } from 'react';

import { LanguageEntity } from '@/types/generated/graphql';

type RepositoryTopLanguageProps = {
  languages?: LanguageEntity[] | null;
};

export const RepositoryTopLanguage: FC<RepositoryTopLanguageProps> = ({ languages }) => {
  const topLanguage = useMemo(() => {
    if (!languages?.length) {
      return null;
    }

    return languages.reduce((prev, curr) => ((curr.size ?? 0) > (prev.size ?? 0) ? curr : prev));
  }, [languages]);

  if (!topLanguage) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/20 shrink-0"
        style={{ backgroundColor: topLanguage.color! }}
        aria-hidden
      />
      <span className="text-sm">{topLanguage.name}</span>
    </div>
  );
};
