import type { FC } from 'react';

import { ButtonGroup, LinkGroupItem } from '@/components/button-group/button-group';

type SummaryTabsProps = {
  label: string;
  items: { label: string; href: string; active: boolean }[];
};

/** The metric a summary ranking orders by, as links. */
export const SummaryTabs: FC<SummaryTabsProps> = ({ label, items }) => (
  <nav aria-label={label} className="max-w-full overflow-x-auto">
    <ButtonGroup>
      {items.map((item) => (
        <LinkGroupItem key={item.href} href={item.href} active={item.active}>
          {item.label}
        </LinkGroupItem>
      ))}
    </ButtonGroup>
  </nav>
);
