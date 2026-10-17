'use client';

import Image from 'next/image';
import type { FC, ReactNode } from 'react';

import { fillTime, MAKER, type RefreshMessage } from './refresh-messages';
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
};

const withLink = (text: string, link?: RefreshMessage['noteLink']): ReactNode => {
  if (!link || !text.includes(link.text)) {
    return text;
  }

  const [before, after] = text.split(link.text);
  return (
    <>
      {before}
      <a href={link.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
        {link.text}
      </a>
      {after}
    </>
  );
};

const ActionButton: FC<{ action: RefreshDialogAction; label: string; variant: 'default' | 'secondary' }> = ({
  action,
  label,
  variant,
}) =>
  action.href ? (
    <Button asChild variant={variant}>
      <a href={action.href} target="_blank" rel="noopener noreferrer" onClick={action.onClick}>
        {label}
      </a>
    </Button>
  ) : (
    <Button type="button" variant={variant} onClick={action.onClick}>
      {label}
    </Button>
  );

/** A short note from the maker, with his photo: what the Refresh button needs and why. */
export const RefreshDialog: FC<RefreshDialogProps> = ({ open, onOpenChange, message, time, primary, secondary }) => {
  const [lead, ...rest] = message.paragraphs.map((paragraph) => fillTime(paragraph, time));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-3 text-left">
          <Image
            src={`${MAKER.avatarUrl}&s=${AVATAR_SIZE * 2}`}
            alt={`${MAKER.name}, maker of GitRanks`}
            className="rounded-full shrink-0"
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            // GitHub already serves it at 2× the size; the optimizer would fetch its smallest preset, 640 px.
            unoptimized
          />
          <DialogTitle className="text-lg leading-snug">{message.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <DialogDescription className="text-foreground">{lead}</DialogDescription>
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
          {message.note && <p className="text-xs text-muted-foreground">{withLink(message.note, message.noteLink)}</p>}
          {message.signature && <p className="text-muted-foreground">{message.signature}</p>}
        </div>

        <DialogFooter>
          <ActionButton
            action={secondary ?? { onClick: () => onOpenChange(false) }}
            label={message.secondary}
            variant="secondary"
          />
          <ActionButton action={primary} label={message.primary} variant="default" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
