import { CountryQuery } from '@/types/generated/graphql';

export const getCountryFlag = (countryList: CountryQuery['country'], country?: string | null) => {
  if (!country || !countryList?.length) {
    return null;
  }

  return countryList.find((c) => c.name === country)?.flag || null;
};
