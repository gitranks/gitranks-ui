/** "the United States", "the Netherlands", "Germany". */
export const countryInSentence = (country: string) =>
  /^(United |Republic of |Democratic Republic )|( Islands| Republic)$|^(Netherlands|Caribbean Netherlands|Philippines|Bahamas|Gambia|Maldives|Comoros|Seychelles|British Indian Ocean Territory)$/.test(
    country,
  )
    ? `the ${country}`
    : country;
