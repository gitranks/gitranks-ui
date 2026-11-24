/**
 * Scrolls `list` sideways just enough to show `item`, and nothing else. `scrollIntoView` would also scroll the page up
 * to the bar: a link to a section further down (`/my/settings#email`) lands there, then the bar's late render took the
 * page back to the top.
 */
export function revealSideways(list: HTMLElement, item: HTMLElement): void {
  const shown = list.getBoundingClientRect();
  const box = item.getBoundingClientRect();
  // On a phone the list's right edge fades out (`TabsBar`): the tab is shown clear of the fade, before it.
  const right = shown.right - endFadeOf(list);
  if (box.left < shown.left) list.scrollLeft -= shown.left - box.left;
  else if (box.right > right) list.scrollLeft += box.right - right;
}

/** How wide the list's end fade is: the blank that ends the list on a phone, as wide as the fade; none on wider screens. */
function endFadeOf(list: HTMLElement): number {
  if (typeof getComputedStyle !== 'function') return 0;
  try {
    return Number.parseFloat(getComputedStyle(list, '::after').width) || 0;
  } catch {
    return 0;
  }
}
