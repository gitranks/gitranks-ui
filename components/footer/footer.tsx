import { FaGithub } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { FaBluesky } from 'react-icons/fa6';
import { FaMastodon } from 'react-icons/fa6';

import { Link } from '../link/link';

export const Footer = () => {
  return (
    <footer className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3 text-xs">
        <Link href="https://github.com/gitranks/gitranks-ui" target="_blank" rel="noopener noreferrer">
          <FaGithub className="h-5 w-5 text-gray-500" />
        </Link>
        <Link href="https://x.com/gitranks" target="_blank" rel="noopener noreferrer">
          <FaXTwitter className="h-5 w-5 text-gray-500" />
        </Link>
        <Link href="https://bsky.app/profile/gitranks.bsky.social" target="_blank" rel="noopener noreferrer">
          <FaBluesky className="h-5 w-5 text-gray-500" />
        </Link>
        <Link href="https://mastodon.social/@gitranks" target="_blank" rel="noopener noreferrer">
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
