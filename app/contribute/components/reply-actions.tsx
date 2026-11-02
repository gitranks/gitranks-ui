'use client';

import { useState } from 'react';

import { ApproveReplyButton } from './approve-reply-button';
import { DismissReplyButton } from './dismiss-reply-button';

/**
 * What the user can do with a reply that waits for them: approve it (again), post it as a comment on the pull request
 * when GitHub refused it in its review thread (`commentWhere`), or dismiss it. Once one goes through, the others stay
 * off until the page reads the reply again (`version`).
 */
export function ReplyActions({
  draftId,
  version,
  where,
  commentWhere,
  again,
  blocked,
  showApprove,
  who,
}: {
  draftId: string;
  version: string;
  /** Where an approval posts it: `as a reply in the review thread on PR #12`. */
  where: string;
  /** Set when it may go as a comment on the pull request instead: `as a comment on pull request #12`. */
  commentWhere: string | null;
  again: boolean;
  blocked: string | null;
  /** False for a reply with no words yet: only Dismiss. */
  showApprove: boolean;
  /** Whom the reply answers, for the buttons' names. */
  who: string;
}) {
  const [acted, setActed] = useState(false);
  const [seen, setSeen] = useState(version);
  if (seen !== version) {
    setSeen(version);
    setActed(false);
  }
  const done = () => setActed(true);

  return (
    <div className="flex flex-wrap items-start gap-2">
      {showApprove ? (
        <ApproveReplyButton
          draftId={draftId}
          version={version}
          where={where}
          again={again}
          blocked={blocked}
          disabled={acted}
          onDone={done}
        />
      ) : null}
      {showApprove && commentWhere ? (
        <ApproveReplyButton
          draftId={draftId}
          version={version}
          where={commentWhere}
          again={false}
          blocked={null}
          asComment
          disabled={acted}
          onDone={done}
        />
      ) : null}
      <DismissReplyButton draftId={draftId} label={`Dismiss the reply to ${who}`} disabled={acted} onDone={done} />
    </div>
  );
}
