import { FC } from 'react';

import { CountryQuery } from '@/types/generated/graphql';

import { CountrySelect } from './country-select';

type CountrySwitcherProps = {
  options?: CountryQuery['country'];
};

export const CountrySwitcher: FC<CountrySwitcherProps> = ({ options }) => {
  return (
    <div className="text-sm flex flex-col gap-1">
      <div>Country:</div>
      <CountrySelect options={options} />
    </div>
  );
};
