import { type FC, Fragment } from 'react';

import type { StatsPart } from './ranking-stats.utils';
import { Link } from '@/components/link/link';

/**
 * Facts about a ranking in plain sentences, rendered on the server so that readers without JavaScript
 * get them too. Set as quiet supporting text, like the profile summary.
 */
export const RankingStats: FC<{ parts: StatsPart[] }> = ({ parts }) => {
  if (!parts.length) {
    return null;
  }

  return (
    <p className="text-sm text-muted-foreground" data-testid="ranking-stats">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {typeof part === 'string' ? (
            part
          ) : (
            <Link href={part.href} className="text-inherit hover:text-foreground">
              {part.text}
            </Link>
          )}
        </Fragment>
      ))}
    </p>
  );
};
