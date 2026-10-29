/**
 * A `git format-patch` text read into files and lines, for the review's diff. The text is untrusted: it is only ever
 * split into strings here, and rendered as text.
 */

export type PatchLineKind = 'hunk' | 'context' | 'add' | 'del' | 'note';

export type PatchLine = { kind: PatchLineKind; text: string };

export type PatchFile = {
  /** The path after the change; the old one for a deleted file. */
  path: string;
  /** Set when the file was renamed or copied. */
  from: string | null;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  binary: boolean;
  added: number;
  removed: number;
  lines: PatchLine[];
};

export type ParsedPatch = { files: PatchFile[]; added: number; removed: number };

const HUNK = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/;
const DIFF = /^diff --git (?:"?a\/(.+?)"?) (?:"?b\/(.+?)"?)$/;

/** `a/x` or `b/x` without its prefix; null for `/dev/null`. */
const pathOf = (value: string) => {
  const bare = value.replace(/\t.*$/, '').replace(/^"|"$/g, '');
  if (bare === '/dev/null') return null;
  return bare.replace(/^[ab]\//, '');
};

/** Reads a format-patch (one commit or several) into its files; a file changed by two commits is shown once. */
export function parsePatch(text: string | null | undefined): ParsedPatch {
  const files: PatchFile[] = [];
  const byPath = new Map<string, PatchFile>();
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');

  let file: PatchFile | null = null;
  // Lines left in the current hunk, old and new side: a hunk is read by its counts, so a removed line that reads like
  // a header or the signature (`-- `) stays a line of the diff.
  let oldLeft = 0;
  let newLeft = 0;

  const open = (path: string, from: string | null) => {
    const known = byPath.get(path);
    if (known) {
      file = known;
      return;
    }
    file = { path, from, status: 'modified', binary: false, added: 0, removed: 0, lines: [] };
    byPath.set(path, file);
    files.push(file);
  };

  for (const line of lines) {
    if (file && (oldLeft > 0 || newLeft > 0)) {
      const current: PatchFile = file;
      if (line.startsWith('\\')) {
        current.lines.push({ kind: 'note', text: line });
        continue;
      }
      if (line.startsWith('+')) {
        current.lines.push({ kind: 'add', text: line });
        current.added += 1;
        newLeft -= 1;
        continue;
      }
      if (line.startsWith('-')) {
        current.lines.push({ kind: 'del', text: line });
        current.removed += 1;
        oldLeft -= 1;
        continue;
      }
      if (line.startsWith(' ') || line === '') {
        current.lines.push({ kind: 'context', text: line });
        oldLeft -= 1;
        newLeft -= 1;
        continue;
      }
      // A hunk shorter than its header said: read on as headers.
      oldLeft = 0;
      newLeft = 0;
    }

    const diff = DIFF.exec(line);
    if (diff) {
      open(diff[2], diff[1] !== diff[2] ? diff[1] : null);
      continue;
    }
    if (!file) continue;
    const current: PatchFile = file;

    const hunk = HUNK.exec(line);
    if (hunk) {
      oldLeft = hunk[1] === undefined ? 1 : Number(hunk[1]);
      newLeft = hunk[2] === undefined ? 1 : Number(hunk[2]);
      current.lines.push({ kind: 'hunk', text: line });
      continue;
    }
    // "No newline at end of file" after a hunk's last line.
    if (line.startsWith('\\ ') && current.lines.length) current.lines.push({ kind: 'note', text: line });
    else if (line.startsWith('new file mode')) current.status = 'added';
    else if (line.startsWith('deleted file mode')) current.status = 'deleted';
    else if (line.startsWith('rename from ') || line.startsWith('copy from ')) {
      current.status = 'renamed';
      current.from = line.replace(/^(?:rename|copy) from /, '');
    } else if (line.startsWith('Binary files ') || line === 'GIT binary patch') current.binary = true;
    else if (line.startsWith('--- ') && current.status === 'modified' && pathOf(line.slice(4)) === null) {
      current.status = 'added';
    } else if (line.startsWith('+++ ') && pathOf(line.slice(4)) === null) current.status = 'deleted';
    // Anything else between files (the index line, a commit's mail headers, the signature) is not shown.
  }

  return {
    files,
    added: files.reduce((sum, { added }) => sum + added, 0),
    removed: files.reduce((sum, { removed }) => sum + removed, 0),
  };
}
