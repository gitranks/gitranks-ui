import type { FC } from 'react';

import { ButtonGroup, LinkGroupItem } from '@/components/button-group/button-group';
import { LanguageSummaryOrder } from '@/types/generated/graphql';

type LanguageOrderSwitcherProps = {
  orderBy: LanguageSummaryOrder;
  country: string;
};

export const LanguageOrderSwitcher: FC<LanguageOrderSwitcherProps> = ({ orderBy, country }) => {
  return (
    <div className="text-sm flex flex-col gap-1">
      Order By:
      <ButtonGroup>
        <LinkGroupItem href={`/languages/${country}/score/1`} active={orderBy === LanguageSummaryOrder.Score}>
          Stars
        </LinkGroupItem>
        <LinkGroupItem href={`/languages/${country}/size/1`} active={orderBy === LanguageSummaryOrder.Size}>
          Size
        </LinkGroupItem>
        <LinkGroupItem href={`/languages/${country}/users/1`} active={orderBy === LanguageSummaryOrder.Users}>
          User Count
        </LinkGroupItem>
      </ButtonGroup>
    </div>
  );
};
