import { FaGithub } from 'react-icons/fa';
import { FaBluesky, FaMastodon, FaXTwitter } from 'react-icons/fa6';

import { Link } from '../link/link';
import { SITE_SOCIAL_LINKS } from '@/lib/seo/site';

export const Footer = () => {
  return (
    <footer className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3 text-xs">
        <Link href={SITE_SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer">
          <FaGithub className="h-5 w-5 text-gray-500" />
        </Link>
        <Link href={SITE_SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer">
          <FaXTwitter className="h-5 w-5 text-gray-500" />
        </Link>
        <Link href={SITE_SOCIAL_LINKS.bluesky} target="_blank" rel="noopener noreferrer">
          <FaBluesky className="h-5 w-5 text-gray-500" />
        </Link>
        <Link href={SITE_SOCIAL_LINKS.mastodon} target="_blank" rel="me noopener noreferrer">
          <FaMastodon className="h-5 w-5 text-gray-500" />
        </Link>
      </div>
      <p className="text-xs">
        <span className="hidden md:inline">Hand-coded with love, bugs, and dreams by</span>
        <span className="inline md:hidden">brought to you by</span>{' '}
        <Link href="https://github.com/maslianok" target="_blank" rel="noopener noreferrer">
          @maslianok
        </Link>
      </p>
    </footer>
  );
};
