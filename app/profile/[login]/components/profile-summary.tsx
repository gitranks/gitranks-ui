import { type FC, Fragment } from 'react';

import type { SummaryPart } from '../utils/profile-summary';
import { Link } from '@/components/link/link';

/**
 * The profile in plain sentences, rendered on the server so that readers without JavaScript get it too.
 * Set as quiet supporting text: links keep their underline but take the text's color.
 */
export const ProfileSummary: FC<{ parts: SummaryPart[] }> = ({ parts }) => (
  <p className="text-sm text-muted-foreground" data-testid="profile-summary">
    {parts.map((part, i) => (
      <Fragment key={i}>
        {typeof part === 'string' ? (
          part
        ) : (
          <Link href={part.href} title={part.title} className="text-inherit hover:text-foreground">
            {part.text}
          </Link>
        )}
      </Fragment>
    ))}
  </p>
);
