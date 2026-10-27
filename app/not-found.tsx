import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { Page } from '@/components/page/page';

const LINKS = [
  { href: '/by/stars/1', label: 'Developer Rankings' },
  { href: '/countries/stars/1', label: 'Country Rankings' },
  { href: '/languages/global/score/1', label: 'Language Rankings' },
  { href: '/orgs/1', label: 'Org Rankings' },
  { href: '/repos/1', label: 'Repository Rankings' },
];

export default function NotFound() {
  return (
    <>
      <Header />
      <Page className="gap-6 items-center text-center py-16">
        <h1 className="text-2xl md:text-4xl font-semibold">404: Page Not Found</h1>
        <p>This page doesn’t exist, or the ranking doesn’t go this deep.</p>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <li>
            <Link href="/">Home</Link>
          </li>
          {LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href}>{label}</Link>
            </li>
          ))}
        </ul>
      </Page>
    </>
  );
}
