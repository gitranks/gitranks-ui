import { expect } from 'vitest';

/** Server markup as text: tags dropped, the entities React writes decoded, spaces collapsed. */
const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

/** The text of the element with `id` in `html`; fails when nothing has it. */
function textById(html: string, id: string): string {
  const at = html.indexOf(`id="${id}"`);
  expect(at, `nothing has id ${id}`).toBeGreaterThan(-1);
  const tagName = html.slice(html.lastIndexOf('<', at) + 1).match(/^\w+/)?.[0];
  return textOf(html.slice(html.indexOf('>', at) + 1, html.indexOf(`</${tagName}>`, at)));
}

/**
 * Each radio or checkbox's accessible name in server markup, in order: its `aria-label`, or the text of the elements
 * its `aria-labelledby` points at. Fails when a control has neither, or points at nothing.
 */
export function controlNames(html: string, role: 'radio' | 'checkbox'): string[] {
  return [...html.matchAll(new RegExp(`<button[^>]*role="${role}"[^>]*>`, 'g'))].map(([tag]) => {
    const label = tag.match(/aria-label="([^"]+)"/)?.[1];
    if (label) return textOf(label);
    const labelledBy = tag.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(labelledBy, `${tag} has no aria-label or aria-labelledby`).toBeTruthy();
    return (labelledBy ?? '')
      .split(' ')
      .map((id) => textById(html, id))
      .join(' ');
  });
}

/** The text a control's `aria-describedby` points at, per control of `role` (empty when it has none). */
export function controlDescriptions(html: string, role: 'radio' | 'checkbox'): string[] {
  return [...html.matchAll(new RegExp(`<button[^>]*role="${role}"[^>]*>`, 'g'))].map(([tag]) => {
    const describedBy = tag.match(/aria-describedby="([^"]+)"/)?.[1];
    return describedBy
      ? describedBy
          .split(' ')
          .map((id) => textById(html, id))
          .join(' ')
      : '';
  });
}
