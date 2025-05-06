import Link from 'next/link';
import { FC } from 'react';

type TabsBarProps = {
  children: React.ReactNode;
};

type TabProps = {
  href: string;
  children: React.ReactNode;
};

export const TabsBar: FC<TabsBarProps> = ({ children }) => {
  return (
    <div className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-700">
      <ul className="flex flex-wrap -mb-px">{children}</ul>
    </div>
  );
};

export const Tab: FC<TabProps> = ({ href, children }) => {
  return (
    <li className="me-2">
      <Link
        href={href}
        className="inline-block p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300"
      >
        {children}
      </Link>
    </li>
  );
};
