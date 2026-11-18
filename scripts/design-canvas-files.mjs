// The designs canvas's files: which ones a listing of the canvas names, which live files a redraw leaves behind, and
// how many files the canvas holds after a publish. The canvas holds at most 512 files a version besides its type's
// own; a redraw aims to leave it at 450 or fewer.
export const FILES_CAP = 512;
export const FILES_AIM = 450;

const CURRENT = 'project/current/';

/** The canvas's own files a listing names (`Artifact list` with `scope: "files"`, as text): every `project/…` path. */
export const projectPathsOf = (listing) => [...new Set(listing.match(/(?<![\w./-])project\/[^\s"'`,]+/g) ?? [])].sort();

/** Live files on the canvas the publish no longer sends: boards that left the catalogue, images no board shows. */
export const staleLiveFilesOf = (listed, publish) =>
  listed.filter((path) => path.startsWith(CURRENT) && !publish[path]).sort();

/** How many of its own files the canvas holds once the publish lands: the listed ones, plus those sent, minus removals. */
export function filesAfter(listed, publish) {
  const files = new Set(listed);
  for (const [path, source] of Object.entries(publish)) {
    if (source === null) files.delete(path);
    else files.add(path);
  }
  return files.size;
}
