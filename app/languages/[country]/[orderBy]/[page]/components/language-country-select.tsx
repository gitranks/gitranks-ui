'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { FC } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type LanguageCountrySelectProps = {
  countries: string[];
  value?: string;
};

export const LanguageCountrySelect: FC<LanguageCountrySelectProps> = ({ value, countries }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { orderBy, language } = useParams();

  const isSummaryPage = pathname.startsWith('/languages/');

  const onValueChange = (newValue: string) => {
    if (isSummaryPage) {
      router.push(`/languages/${newValue}/${orderBy}/1`);
    } else {
      router.push(`/language/${language}/${newValue}/1`);
    }
  };

  return (
    <div className="text-sm flex flex-col gap-1">
      Country:
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[180px]" size="sm">
          <SelectValue placeholder="Select a country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="global">Global</SelectItem>
          {countries.map((country) => (
            <SelectItem key={country} value={country}>
              {country}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
