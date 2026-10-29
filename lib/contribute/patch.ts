/**
 * A `git format-patch` text read into files and lines, for the review's diff. The text is untrusted: it is only ever
 * split into strings here, and rendered as text.
 */

export type PatchLineKind = 'hunk' | 'context' | 'add' | 'del' | 'note' | 'commit';

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
/** The first line of each commit in a format-patch. */
const COMMIT_START = /^From [0-9a-f]{7,64} /;
/** Git's signature after each commit's diff. */
const SIGNATURE = '-- ';
const SUBJECT = /^Subject: (?:\[[^\]]*\] )?(.*)$/;

/** `a/x` or `b/x` without its prefix; null for `/dev/null`. */
const pathOf = (value: string) => {
  const bare = value.replace(/\t.*$/, '').replace(/^"|"$/g, '');
  if (bare === '/dev/null') return null;
  return bare.replace(/^[ab]\//, '');
};

/**
 * Where the reader is:
 * - `outside`: no file is open (a commit's mail headers and message, the diffstat, the signature);
 * - `header`: after a file's `diff --git` and before its first hunk, where its mode, rename and binary lines are;
 * - `hunk`: inside a hunk, read by its counts;
 * - `between`: after a hunk, where only the file's next hunk or a "No newline" note may follow.
 */
type Phase = 'outside' | 'header' | 'hunk' | 'between';

/**
 * Reads a format-patch (one commit or several) into its files. A file changed by two commits is shown once, with a
 * line naming the next commit between their hunks. File-level lines are read only in a file's header, so nothing in a
 * commit message can relabel a file.
 */
export function parsePatch(text: string | null | undefined): ParsedPatch {
  const files: PatchFile[] = [];
  const byPath = new Map<string, PatchFile>();
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');

  let file: PatchFile | null = null;
  let phase: Phase = 'outside';
  /** The subject of the commit being read. */
  let subject: string | null = null;
  // Lines left in the current hunk, old and new side: a removed line that reads like a header or the signature stays
  // a line of the diff.
  let oldLeft = 0;
  let newLeft = 0;

  const open = (path: string, from: string | null): PatchFile => {
    const known = byPath.get(path);
    if (known) {
      known.lines.push({ kind: 'commit', text: subject ? `Next commit: ${subject}` : 'Next commit' });
      return known;
    }
    const created: PatchFile = { path, from, status: 'modified', binary: false, added: 0, removed: 0, lines: [] };
    byPath.set(path, created);
    files.push(created);
    return created;
  };

  for (const line of lines) {
    if (phase === 'hunk' && file) {
      const current: PatchFile = file;
      let read = true;
      if (line.startsWith('\\')) current.lines.push({ kind: 'note', text: line });
      else if (line.startsWith('+')) {
        current.lines.push({ kind: 'add', text: line });
        current.added += 1;
        newLeft -= 1;
      } else if (line.startsWith('-')) {
        current.lines.push({ kind: 'del', text: line });
        current.removed += 1;
        oldLeft -= 1;
      } else if (line.startsWith(' ') || line === '') {
        current.lines.push({ kind: 'context', text: line });
        oldLeft -= 1;
        newLeft -= 1;
      } else read = false;

      if (read) {
        if (oldLeft <= 0 && newLeft <= 0) phase = 'between';
        continue;
      }
      // A hunk shorter than its header said: nothing after it belongs to the file.
      file = null;
      phase = 'outside';
    }

    if (COMMIT_START.test(line) || line === SIGNATURE) {
      file = null;
      phase = 'outside';
      if (line !== SIGNATURE) subject = null;
      continue;
    }

    const diff = DIFF.exec(line);
    if (diff) {
      const path = diff[2];
      file = open(path, diff[1] !== path ? diff[1] : null);
      phase = 'header';
      continue;
    }

    if (phase === 'outside' || !file) {
      const named = SUBJECT.exec(line);
      if (named && subject === null) subject = named[1].trim() || null;
      continue;
    }
    const current: PatchFile = file;

    const hunk = HUNK.exec(line);
    if (hunk) {
      oldLeft = hunk[1] === undefined ? 1 : Number(hunk[1]);
      newLeft = hunk[2] === undefined ? 1 : Number(hunk[2]);
      current.lines.push({ kind: 'hunk', text: line });
      phase = oldLeft > 0 || newLeft > 0 ? 'hunk' : 'between';
      continue;
    }

    if (phase === 'between') {
      // "No newline at end of file" after a hunk's last line; anything else ends the file.
      if (line.startsWith('\\ ')) current.lines.push({ kind: 'note', text: line });
      else {
        file = null;
        phase = 'outside';
      }
      continue;
    }

    // The file's header (`phase === 'header'`). A file seen in an earlier commit keeps what that commit made it.
    const reopened = current.lines.length > 0;
    if (line.startsWith('new file mode')) current.status = 'added';
    else if (line.startsWith('deleted file mode')) current.status = 'deleted';
    else if (line.startsWith('rename from ') || line.startsWith('copy from ')) {
      if (!(reopened && current.status === 'added')) {
        current.status = 'renamed';
        current.from = line.replace(/^(?:rename|copy) from /, '');
      }
    } else if (line.startsWith('Binary files ') || line === 'GIT binary patch') current.binary = true;
    else if (line.startsWith('--- ') && !reopened && current.status === 'modified' && pathOf(line.slice(4)) === null) {
      current.status = 'added';
    } else if (line.startsWith('+++ ') && pathOf(line.slice(4)) === null) current.status = 'deleted';
    // Anything else in a header (the index line, similarity, binary data) is not shown.
  }

  return {
    files,
    added: files.reduce((sum, { added }) => sum + added, 0),
    removed: files.reduce((sum, { removed }) => sum + removed, 0),
  };
}
