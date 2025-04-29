import { Link } from '../link/link';

export const Footer = () => {
  return (
    <footer className="flex items-center justify-between p-4">
      <div className="flex items-center gap-2 text-xs">
        <Link href="https://github.com/gitranks/gitranks-ui" target="_blank" rel="noopener noreferrer">
          GitHub
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
