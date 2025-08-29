import { FC } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { FaTelegramPlane } from 'react-icons/fa';

import { Link as LinkUnderlined } from '@/components/link/link';

type LayoutLeftColumnProps = Readonly<{
  login: string;
}>;

export const MessengerIntegration: FC<LayoutLeftColumnProps> = ({ login }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap text-sm justify-between px-4 py-4 rounded-xl border-1 mt-8">
      <div className="flex items-center gap-2">Subscribe to {login}&apos;s GitHub rank updates in your messenger</div>
      <div className="flex items-center gap-4">
        <LinkUnderlined
          className="flex items-center gap-2"
          href="https://wa.me/48730654976?text=%2Fmenu"
          target="_blank"
          rel="noopener"
        >
          <FaWhatsapp />
          WhatsApp
        </LinkUnderlined>
        <LinkUnderlined
          className="flex items-center gap-2"
          href="https://t.me/gitranksbot"
          target="_blank"
          rel="noopener"
        >
          <FaTelegramPlane />
          Telegram
        </LinkUnderlined>
      </div>
    </div>
  );
};
