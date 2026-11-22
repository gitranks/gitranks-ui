import Link from 'next/link';
import { Fragment } from 'react';

import type { ContributeFairUseNotice } from '@/lib/workspace/contribute.types';
import { fairUseAnswerPathOf, fairUseMessagePartsOf } from '@/lib/workspace/fair-use';

const LINK = 'font-semibold text-link hover:underline';

/**
 * A message from GitRanks about fair use, in the API's words: the pull requests it names link to GitHub, and "tell us
 * here" or "answer here" link its answer page (plain on the answer page itself, `answerLinks` false).
 */
export function FairUseMessage({
  notice,
  answerLinks = true,
}: {
  notice: Pick<ContributeFairUseNotice, 'id' | 'text' | 'vars'>;
  answerLinks?: boolean;
}) {
  return (
    <>
      {fairUseMessagePartsOf(notice.text, notice.vars.prs).map((part, at) => {
        const key = `${at}-${part.kind}`;
        if (part.kind === 'pr') {
          return (
            <a key={key} href={part.url} target="_blank" rel="noopener noreferrer" className={LINK}>
              {part.text}
            </a>
          );
        }
        if (part.kind === 'answer' && answerLinks) {
          return (
            <Link key={key} href={fairUseAnswerPathOf(notice.id)} prefetch={false} className={LINK}>
              {part.text}
            </Link>
          );
        }
        return <Fragment key={key}>{part.text}</Fragment>;
      })}
    </>
  );
}
