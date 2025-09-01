export const shortenCountryName = (country?: string | null) => {
  if (!country) {
    return '';
  }

  const countryMap: Record<string, string> = {
    'United States': 'USA',
    'United Kingdom': 'UK',
    'United Arab Emirates': 'UAE',
  };

  return countryMap[country] ?? country;
};
