/**
 * Which lines of a before-and-after are in only one side: the lines outside the longest common run of lines (in order,
 * not necessarily next to each other) of the two. Trailing spaces never make a line differ.
 */
export function lineDiffOf(
  before: readonly string[],
  after: readonly string[],
): { removed: boolean[]; added: boolean[] } {
  const a = before.map((line) => line.trimEnd());
  const b = after.map((line) => line.trimEnd());
  // longest[i][j]: the longest common run of a[i..] and b[j..].
  const longest = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      longest[i][j] = a[i] === b[j] ? longest[i + 1][j + 1] + 1 : Math.max(longest[i + 1][j], longest[i][j + 1]);
    }
  }
  const removed = a.map(() => true);
  const added = b.map(() => true);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      removed[i++] = false;
      added[j++] = false;
    } else if (longest[i + 1][j] >= longest[i][j + 1]) i++;
    else j++;
  }
  return { removed, added };
}
