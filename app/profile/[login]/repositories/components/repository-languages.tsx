import { FC, useMemo } from 'react';

import { LanguageEntity } from '@/types/generated/graphql';

type RepositoryLanguageProps = {
  languages?: LanguageEntity[] | null;
};

const LEGEND_LANG_LIMIT = 5;

export const RepositoryLanguages: FC<RepositoryLanguageProps> = ({ languages }) => {
  const items = useMemo(() => {
    if (!languages?.length) {
      return;
    }

    const total = languages.reduce((acc, l) => acc + (l.size || 0), 0);
    if (total <= 0) {
      return languages.map((l) => ({ ...l, percent: 0 }));
    }

    return [...languages].map((l) => ({ ...l, percent: (100 * (l.size || 0)) / total }));
  }, [languages]);

  if (!items?.length) {
    return null;
  }

  const fmt = (n: number) => `${n.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-2 w-full max-w-[256px] shrink-0 rounded overflow-hidden">
      <div
        className="flex h-2 w-full overflow-hidden rounded-full ring-1 ring-black/5 dark:ring-white/10"
        aria-label="Language usage chart"
        title={items.map((i) => `${i.name} ${fmt(i.percent)}`).join(' • ')}
      >
        {items.map((l) => (
          <div
            key={l.name}
            className="h-full"
            style={{
              width: `${l.percent}%`,
              backgroundColor: l.color,
              minWidth: l.percent > 0 ? 2 : 0,
            }}
          />
        ))}
      </div>

      <div className="flex gap-2 flex-wrap text-xs leading-tight pl-0.5">
        {items.slice(0, LEGEND_LANG_LIMIT).map((l) => (
          <div key={l.name} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full ring-1 ring-black/10 dark:ring-white/20 shrink-0"
              style={{ backgroundColor: l.color }}
              aria-hidden
            />
            <span className="">{l.name}</span>
            <span className="tabular-nums text-muted-foreground">{fmt(l.percent)}</span>
          </div>
        ))}
        {items.length > LEGEND_LANG_LIMIT && (
          <div className="text-muted-foreground">and {items.length - LEGEND_LANG_LIMIT} more...</div>
        )}
      </div>
    </div>
  );
};
