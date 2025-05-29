export function ensureLinkProtocol(link?: string | null): string | undefined {
  if (!link) {
    return undefined;
  }

  // if it already starts with http:// or https://, leave it alone
  if (/^https?:\/\//i.test(link)) {
    return link;
  }
  // otherwise prefix with https:// (or http:// if you prefer)
  return `https://${link}`;
}
