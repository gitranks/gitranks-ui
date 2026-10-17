import { type FC, Fragment } from 'react';

import type { SummaryPart } from '../utils/profile-summary';
import { Link } from '@/components/link/link';

/** The profile in plain sentences, rendered on the server so that readers without JavaScript get it too. */
export const ProfileSummary: FC<{ parts: SummaryPart[] }> = ({ parts }) => (
  <p className="leading-relaxed" data-testid="profile-summary">
    {parts.map((part, i) => (
      <Fragment key={i}>{typeof part === 'string' ? part : <Link href={part.href}>{part.text}</Link>}</Fragment>
    ))}
  </p>
);
