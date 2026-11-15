import type { ReactNode } from 'react';

import { ActionButton, RefreshMessageBody } from '@/components/refresh-dialogs/refresh-dialog';
import { fillTime, MAKER, type RefreshMessage } from '@/components/refresh-dialogs/refresh-messages';

/**
 * A Refresh dialog drawn open over its page: a portal renders nothing on the server, so the board draws the dialog's
 * box with the message's own body and buttons. The maker's photo is a lettered circle: the boards draw no outside image.
 */
export function OpenRefreshDialog({
  page,
  message,
  time,
}: {
  page: ReactNode;
  message: RefreshMessage;
  time?: string;
}) {
  const title = fillTime(message.title, time);

  return (
    <div className="relative">
      {page}
      <div className="absolute inset-0 flex items-start justify-center bg-black/50 px-4 pt-28">
        <div
          role="dialog"
          aria-label={title}
          className="grid w-full max-w-md gap-4 rounded-lg border bg-background p-6 shadow-lg"
        >
          <div className="flex items-center gap-3">
            {message.photo && (
              <span
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted font-semibold"
              >
                {MAKER.name[0]}
              </span>
            )}
            <h2 className="text-lg leading-snug font-semibold">{title}</h2>
          </div>
          <RefreshMessageBody message={message} time={time} renderLead={(lead) => <p>{lead}</p>} />
          <div className="flex justify-end gap-2">
            <ActionButton action={{}} label={message.secondary} variant="secondary" />
            <ActionButton action={{}} label={message.primary} variant="default" icon={message.primaryIcon} />
          </div>
        </div>
      </div>
    </div>
  );
}
