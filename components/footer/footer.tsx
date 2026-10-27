import { FaGithub } from 'react-icons/fa';
import { FaBluesky, FaMastodon, FaXTwitter } from 'react-icons/fa6';

import { Link } from '../link/link';
import { SITE_SOCIAL_LINKS } from '@/lib/seo/site';

const SITE_LINKS = [
  { href: '/by/stars/1', label: 'Developer Rankings' },
  { href: '/countries/stars/1', label: 'Country Rankings' },
  { href: '/languages/global/score/1', label: 'Language Rankings' },
  { href: '/orgs/1', label: 'Org Rankings' },
  { href: '/repos/1', label: 'Repository Rankings' },
  { href: '/insights', label: 'Insights' },
  { href: '/badge/gallery', label: 'Badges' },
  { href: '/methodology', label: 'How Rankings Work' },
];

export const Footer = () => {
  return (
    <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 p-4">
      <nav aria-label="Site">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {SITE_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className="text-muted-foreground hover:text-foreground no-underline hover:underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* Phones put the credit line under the icons: beside them it wraps to three lines at 320px. */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-xs">
          <Link href={SITE_SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer">
            <FaGithub className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Link href={SITE_SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer">
            <FaXTwitter className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Link href={SITE_SOCIAL_LINKS.bluesky} target="_blank" rel="noopener noreferrer">
            <FaBluesky className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Link href={SITE_SOCIAL_LINKS.mastodon} target="_blank" rel="me noopener noreferrer">
            <FaMastodon className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>
        <p className="text-xs md:text-right">
          Built by{' '}
          <Link href="https://github.com/maslianok" target="_blank" rel="noopener noreferrer">
            @maslianok
          </Link>
          . Yes, I've checked my own rank. No, we don't talk about it.
        </p>
      </div>
    </footer>
  );
};
