'use client';
import { FC } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CountryQuery } from '@/types/generated/graphql';

type CountrySelectProps = {
  options?: CountryQuery['country'];
};

export const CountrySelect: FC<CountrySelectProps> = ({ options }) => {
  return (
    <Select onValueChange={() => {}} defaultValue={''}>
      <SelectTrigger className="min-w-[200px]">
        <SelectValue placeholder="Select a country" />
      </SelectTrigger>
      <SelectContent>
        {options?.map((country) => (
          <SelectItem key={country.name} value={country.name}>
            {country.flag} {country.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
