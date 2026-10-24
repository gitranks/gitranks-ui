import type { FC } from 'react';
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';

import { ProfileCard, ProfileCardHeader } from './profile-card';
import { TELEGRAM_BOT_URL, WHATSAPP_BOT_URL } from '@/app/app.consts';
import { Button } from '@/components/ui/button';

type MessengerIntegrationProps = Readonly<{
  login: string;
}>;

export const MessengerIntegration: FC<MessengerIntegrationProps> = ({ login }) => {
  return (
    <ProfileCard className="gap-3">
      <div className="flex flex-col gap-1">
        <ProfileCardHeader>Rank updates</ProfileCardHeader>
        <p className="text-sm text-muted-foreground">
          Follow {login}&apos;s GitHub rank in your messenger, daily or weekly.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={TELEGRAM_BOT_URL} target="_blank" rel="noopener">
            <FaTelegramPlane aria-hidden />
            Telegram
          </a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={WHATSAPP_BOT_URL} target="_blank" rel="noopener">
            <FaWhatsapp aria-hidden />
            WhatsApp
          </a>
        </Button>
      </div>
    </ProfileCard>
  );
};
