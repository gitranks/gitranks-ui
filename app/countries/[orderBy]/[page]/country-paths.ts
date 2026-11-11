/** A country's row id on the country ranking, which a `#…` link opens and marks. Safe in a CSS selector. */
export const countryAnchor = (country: string) =>
  `country-${country
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

/** The country ranking's page, `order` as the URL writes it (`stars`). */
export const countriesPagePath = (order: string, page = 1) => `/countries/${order}/${page}`;
