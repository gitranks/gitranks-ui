import type { EntityKind, ImageFormat, Theme } from '@/badge/v3/types';
import { getRepoPath } from '@/utils/repo-paths';

/** `/badge/{kind}/{name}/{badge}.svg`, each part of the name encoded. */
export function badgePath(kind: EntityKind, name: string, badgeId: string, format: ImageFormat = 'svg'): string {
  return `/badge/${kind}/${name.split('/').map(encodeURIComponent).join('/')}/${badgeId}.${format}`;
}

/** A badge image URL: the path and the style query. */
export function badgeImageUrl(
  origin: string,
  kind: EntityKind,
  name: string,
  badgeId: string,
  query: URLSearchParams,
): string {
  const search = query.toString();
  return `${origin}${badgePath(kind, name, badgeId)}${search ? `?${search}` : ''}`;
}

/** The same image pinned to one drawing of an Auto badge. */
export function withTheme(url: string, theme: Theme): string {
  return `${url}${url.includes('?') ? '&' : '?'}theme=${theme}`;
}

/** The GitRanks page the image links to; a developer's country badge links to their country tab. */
export function entityPageUrl(origin: string, kind: EntityKind, name: string, scope?: string): string {
  switch (kind) {
    case 'repo':
      return `${origin}${getRepoPath(name)}`;
    case 'org':
      return `${origin}/org/${encodeURIComponent(name)}`;
    case 'user':
      return `${origin}/profile/${encodeURIComponent(name)}${scope === 'country' ? '/country' : ''}`;
  }
}

export type Snippet = { imageUrl: string; pageUrl: string; alt: string; auto: boolean };

/** Parentheses would end a Markdown link early. */
const markdownUrl = (url: string) => url.replace(/\(/g, '%28').replace(/\)/g, '%29');
const markdownText = (text: string) => text.replace(/([[\]\\])/g, '\\$1');

/** `[![alt](image)](page)`: the plain image, which follows the reader's system theme when it is Auto. */
export function markdownSnippet({ imageUrl, pageUrl, alt }: Snippet): string {
  return `[![${markdownText(alt)}](${markdownUrl(imageUrl)})](${markdownUrl(pageUrl)})`;
}

const attribute = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The image in a link. An Auto badge is wrapped in `<picture>` with a light and a dark source, so on GitHub it
 * follows GitHub's own theme rather than the reader's system.
 */
export function htmlSnippet({ imageUrl, pageUrl, alt, auto }: Snippet): string {
  const href = attribute(pageUrl);
  const altText = attribute(alt);
  if (!auto) {
    return `<a href="${href}"><img src="${attribute(imageUrl)}" alt="${altText}"></a>`;
  }
  return [
    `<a href="${href}">`,
    '  <picture>',
    `    <source media="(prefers-color-scheme: dark)" srcset="${attribute(withTheme(imageUrl, 'dark'))}">`,
    `    <img src="${attribute(withTheme(imageUrl, 'light'))}" alt="${altText}">`,
    '  </picture>',
    '</a>',
  ].join('\n');
}

export const SNIPPET_FORMATS = [
  { value: 'markdown', name: 'Markdown' },
  { value: 'html', name: 'HTML' },
  { value: 'url', name: 'Image URL' },
] as const;

export type SnippetFormat = (typeof SNIPPET_FORMATS)[number]['value'];

export function snippetOf(format: SnippetFormat, snippet: Snippet): string {
  switch (format) {
    case 'markdown':
      return markdownSnippet(snippet);
    case 'html':
      return htmlSnippet(snippet);
    case 'url':
      return snippet.imageUrl;
  }
}
