import { FaWhatsapp } from 'react-icons/fa';
import { FaTelegramPlane } from 'react-icons/fa';

import { NewBadge } from '@/components/new-badge/new-badge';
import { Button } from '@/components/ui/button';

export const MessengerIntegrationSection = () => {
  return (
    <div className="flex flex-col gap-4 grow py-8">
      <h2 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
        Get Rank Updates
        <NewBadge />
      </h2>
      <div>
        Stay updated on your GitHub profile&apos;s rank — daily or weekly, right in your favorite messaging app.
      </div>
      <div className="flex gap-4">
        <Button asChild variant="outline" size="sm">
          <a
            className="flex items-center gap-2"
            href="https://wa.me/48730654976?text=%2Fmenu"
            target="_blank"
            rel="noopener"
          >
            <FaWhatsapp />
            WhatsApp bot
          </a>
        </Button>

        <Button asChild variant="outline" size="sm">
          <a className="flex items-center gap-2" href="https://t.me/gitranksbot" target="_blank" rel="noopener">
            <FaTelegramPlane />
            Telegram bot
          </a>
        </Button>
      </div>
    </div>
  );
};
