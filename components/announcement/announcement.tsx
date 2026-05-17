'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { StarIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useLocalStorage, useMediaQuery } from 'usehooks-ts';

import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const GITHUB_REPO_URL = 'https://github.com/gitranks/gitranks-ui';

type AnnouncementState = 'default' | 'stubborn' | 'thanked';

const getContent = (state: AnnouncementState) => {
  switch (state) {
    case 'thanked':
      return {
        title: 'Wait... someone actually clicked it?! 🤯',
        description: "I've been sitting here for months thinking these alerts are useless. Thank you, legend 🫡",
      };
    case 'stubborn':
      return {
        title: 'Nope! 😤 I refuse to close!',
        description: "Be kind and star the repo, or I'll reduce your rank! 😈 (jk... or am I? 👀)",
      };
    default:
      return {
        title: 'This service is 100% free',
        description: 'Your GitHub star is the only thing keeping it alive',
      };
  }
};

export const Announcement = () => {
  const [dismissed, setDismissed] = useLocalStorage('announcement-dismissed', false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [state, setState] = useState<AnnouncementState>('default');

  if (dismissed || !isDesktop) {
    return null;
  }

  const handleDismiss = () => {
    if (state === 'default') {
      sendGAEvent('event', 'announcement_dismiss_attempt');
      setState('stubborn');
    } else {
      sendGAEvent('event', 'announcement_dismiss');
      setDismissed(true);
    }
  };

  const handleStarClick = () => {
    sendGAEvent('event', 'announcement_star_click');
    setState('thanked');
  };

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Alert className="flex w-fit">
        <div className="flex items-center gap-4">
          <div>
            <AlertTitle>{getContent(state).title}</AlertTitle>
            <AlertDescription>{getContent(state).description}</AlertDescription>
          </div>
          <div className="col-start-2 flex items-center gap-2 mt-1">
            {state !== 'thanked' && (
              <Button asChild size="xs">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" onClick={handleStarClick}>
                  <StarIcon />
                  Star
                </a>
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={handleDismiss} aria-label="Dismiss">
              <XIcon />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};
