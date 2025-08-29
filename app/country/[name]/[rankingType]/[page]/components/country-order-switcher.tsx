import { FC } from 'react';

import { ButtonGroup, LinkGroupItem } from '@/components/button-group/button-group';
import { CountrySummaryOrder } from '@/types/generated/graphql';

type CountryOrderSwitcherProps = {
  orderBy: CountrySummaryOrder;
};

export const CountryOrderSwitcher: FC<CountryOrderSwitcherProps> = ({ orderBy }) => {
  const orderByUpper = orderBy.toUpperCase() as CountrySummaryOrder;

  return (
    <div className="text-sm flex flex-col gap-1">
      Order By:
      <ButtonGroup>
        <LinkGroupItem href="/countries/stars/1" active={orderByUpper === CountrySummaryOrder.Stars}>
          Stars
        </LinkGroupItem>
        <LinkGroupItem href="/countries/contributions/1" active={orderByUpper === CountrySummaryOrder.Contributions}>
          Contributions
        </LinkGroupItem>
        <LinkGroupItem href="/countries/followers/1" active={orderByUpper === CountrySummaryOrder.Followers}>
          Followers
        </LinkGroupItem>
        <LinkGroupItem href="/countries/users/1" active={orderByUpper === CountrySummaryOrder.Users}>
          User count
        </LinkGroupItem>
      </ButtonGroup>
    </div>
  );
};
