'use client';

import { Check, Star } from 'lucide-react';
import Image from 'next/image';
import type { FC, ReactNode } from 'react';

import { fillTime, MAKER, type NoteLink, type RefreshMessage } from './refresh-messages';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const AVATAR_SIZE = 48;

/** A button, or a link that opens in a new tab. */
export type RefreshDialogAction = { onClick?: () => void; href?: string };

type RefreshDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: RefreshMessage;
  /** Fills `{time}` in the message. */
  time?: string;
  primary: RefreshDialogAction;
  /** Closes the dialog unless it has its own action. */
  secondary?: RefreshDialogAction;
  /** Where focus goes on close: the dialog has no trigger of its own to return to. */
  onCloseAutoFocus?: (event: Event) => void;
  /** What a note link without `href` does. */
  onNoteAction?: () => void;
  /** Under the small print: what the note's action answered. */
  noteStatus?: ReactNode;
};

const LINK_CLASS = 'underline underline-offset-2';

/** A note link: another site opens in a new tab, a page of this one in the same tab, and one without `href` acts. */
const NoteAnchor: FC<{ link: NoteLink; onAction?: () => void }> = ({ link, onAction }) => {
  if (!link.href) {
    return (
      <button type="button" className={`${LINK_CLASS} cursor-pointer`} onClick={onAction}>
        {link.text}
      </button>
    );
  }

  return link.href.startsWith('/') ? (
    <a href={link.href} className={LINK_CLASS}>
      {link.text}
    </a>
  ) : (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
      {link.text}
    </a>
  );
};

/** The small print with each link's text, at its first place, made a link. */
const withLinks = (text: string, links: NoteLink[] = [], onAction?: () => void): ReactNode => {
  const link = links.find((candidate) => text.includes(candidate.text));
  if (!link) {
    return text;
  }

  const at = text.indexOf(link.text);
  const others = links.filter((candidate) => candidate !== link);
  return (
    <>
      {withLinks(text.slice(0, at), others, onAction)}
      <NoteAnchor link={link} onAction={onAction} />
      {withLinks(text.slice(at + link.text.length), others, onAction)}
    </>
  );
};

/** The deal's steps so far: a done one is checked and muted, the next ones numbered by their place. */
const Checklist: FC<{ items: NonNullable<RefreshMessage['checklist']> }> = ({ items }) => (
  <ol className="flex flex-col gap-1">
    {items.map((item, index) => (
      <li
        key={item.text}
        className={item.done ? 'flex items-center gap-2 text-muted-foreground' : 'flex items-center gap-2'}
      >
        {item.done ? (
          <>
            <Check className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">Done: </span>
          </>
        ) : (
          <span className="w-4 shrink-0 text-center">{index + 1}.</span>
        )}
        <span>{item.text}</span>
      </li>
    ))}
  </ol>
);

export const ActionButton: FC<{
  action: RefreshDialogAction;
  label: string;
  variant: 'default' | 'secondary';
  icon?: RefreshMessage['primaryIcon'];
}> = ({ action, label, variant, icon }) => {
  const content = (
    <>
      {icon === 'star' && <Star aria-hidden />}
      {label}
    </>
  );

  return action.href ? (
    <Button asChild variant={variant}>
      <a href={action.href} target="_blank" rel="noopener noreferrer" onClick={action.onClick}>
        {content}
      </a>
    </Button>
  ) : (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {content}
    </Button>
  );
};

type RefreshMessageBodyProps = Pick<RefreshDialogProps, 'message' | 'time' | 'onNoteAction' | 'noteStatus'> & {
  /** The first paragraph: the dialog's description in a dialog. */
  renderLead: (text: string) => ReactNode;
};

/** A message's text between its title and its buttons: the same in the dialog and on the design boards. */
export const RefreshMessageBody: FC<RefreshMessageBodyProps> = ({
  message,
  time,
  onNoteAction,
  noteStatus,
  renderLead,
}) => {
  const [lead, ...rest] = message.paragraphs.map((paragraph) => fillTime(paragraph, time));

  return (
    <div className="flex flex-col gap-3 text-sm">
      {message.checklist && <Checklist items={message.checklist} />}
      {renderLead(lead)}
      {rest.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      {message.steps && (
        <ol className="list-decimal pl-5 flex flex-col gap-1">
          {message.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      {message.closing?.map((paragraph) => (
        <p key={paragraph}>{fillTime(paragraph, time)}</p>
      ))}
      {message.note && (
        <p className="text-xs text-muted-foreground">{withLinks(message.note, message.noteLinks, onNoteAction)}</p>
      )}
      {noteStatus}
      {message.signature && <p className="text-muted-foreground">{message.signature}</p>}
    </div>
  );
};

/** A short note on what the Refresh button needs and why; the maker's own notes carry his photo. */
export const RefreshDialog: FC<RefreshDialogProps> = ({
  open,
  onOpenChange,
  message,
  time,
  primary,
  secondary,
  onCloseAutoFocus,
  onNoteAction,
  noteStatus,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="flex-row items-center gap-3 text-left">
          {message.photo && (
            <Image
              src={`${MAKER.avatarUrl}&s=${AVATAR_SIZE * 2}`}
              alt={`${MAKER.name}, maker of GitRanks`}
              className="rounded-full shrink-0"
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
              // GitHub already serves it at 2× the size; the optimizer would fetch its smallest preset, 640 px.
              unoptimized
            />
          )}
          <DialogTitle className="text-lg leading-snug">{fillTime(message.title, time)}</DialogTitle>
        </DialogHeader>

        <RefreshMessageBody
          message={message}
          time={time}
          onNoteAction={onNoteAction}
          noteStatus={noteStatus}
          renderLead={(lead) => <DialogDescription className="text-foreground">{lead}</DialogDescription>}
        />

        <DialogFooter>
          <ActionButton
            action={secondary ?? { onClick: () => onOpenChange(false) }}
            label={message.secondary}
            variant="secondary"
          />
          <ActionButton action={primary} label={message.primary} variant="default" icon={message.primaryIcon} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
