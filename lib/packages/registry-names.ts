// The name rules of the registries whose names need more than a pattern: Go's module paths, crates.io's, pub.dev's,
// Packagist's and Maven Central's. Each is the registry's own rule, as a visitor's spelling is checked before any
// read; the folds are the registries' own, so every spelling a registry takes as one name has one address here.

/** The longest name the site takes for each of these registries. */
export const GO_NAME_MAX_LENGTH = 500;
export const CRATE_NAME_MAX_LENGTH = 64;
export const PUB_NAME_MAX_LENGTH = 64;
export const PACKAGIST_NAME_MAX_LENGTH = 255;
export const MAVEN_NAME_MAX_LENGTH = 500;

/** A Go module path's element: letters, digits, `.`, `_`, `~` and `-`. */
const GO_ELEMENT = /^[A-Za-z0-9._~-]+$/;
/** Names Windows reserves for devices, refused by Go as an element's part before its first dot, in any case. */
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
/** A Windows short name's ending, refused by Go in an element's part before its first dot: `~` and digits. */
const SHORT_NAME = /~\d+$/;
/** The first element: a host name, lower case. */
const GO_HOST = /^[a-z0-9.-]+$/;
/** Hosts reserved for examples, tests and private networks: never a public module's. */
const NEVER_RESOLVES = /(?:^|\.)(?:example\.(?:com|net|org)|[^.]+\.(?:example|test|invalid|localhost|local|internal))$/;
/** A last element Go reads as a major version suffix: `v`, then digits and dots. */
const MAJOR_LIKE = /^v[\d.]+$/;
/** A major version suffix Go takes: digits only, no leading zero. */
const MAJOR = /^v[1-9]\d*$/;
/** A `gopkg.in` path's version: `.vN`, N with no leading zero, optionally `-unstable`. */
const GOPKG_IN_MAJOR = /\.v(?:0|[1-9]\d*)(?:-unstable)?$/;

function isGoElement(element: string): boolean {
  if (!GO_ELEMENT.test(element) || element.startsWith('.') || element.endsWith('.')) return false;
  const short = element.split('.')[0];
  return !WINDOWS_RESERVED.test(short) && !SHORT_NAME.test(short);
}

/**
 * Whether a name is a Go module path the module proxy could serve, by Go's rule for module paths, as written (case is
 * never folded: `github.com/BurntSushi/toml`): elements by `/`, none empty, of `A–Z a–z 0–9 . _ ~ -`, never starting or
 * ending with `.`, no Windows device name or short name; the first element a lower-case host with a dot that does not
 * start with `-`; a major version suffix only as `/vN` with N from 2 (`gopkg.in/` paths end with `.vN`). A host
 * reserved for examples, tests or private networks is no module's, and a path is 500 characters at most.
 */
export function isGoModulePath(path: string): boolean {
  if (!path || path.length > GO_NAME_MAX_LENGTH) return false;
  const elements = path.split('/');
  const [host] = elements;
  if (!GO_HOST.test(host) || !host.includes('.') || host.startsWith('-') || NEVER_RESOLVES.test(host)) return false;
  if (!elements.every(isGoElement)) return false;
  if (path.startsWith('gopkg.in/')) return GOPKG_IN_MAJOR.test(path);
  const last = elements[elements.length - 1];
  return elements.length === 1 || !MAJOR_LIKE.test(last) || (MAJOR.test(last) && last !== 'v1');
}

/** Hosts whose module paths are `host/owner/repo`, with a `/vN` major version after them. */
const OWNER_REPO_HOSTS = new Set(['github.com', 'gitlab.com', 'bitbucket.org']);

/**
 * The module a package's path on pkg.go.dev is in, where the host's rule for module paths is known: on GitHub, GitLab
 * and Bitbucket, `host/owner/repo` and a `/vN` major version after it (`github.com/gin-gonic/gin/binding` is in
 * `github.com/gin-gonic/gin`); `golang.org/x/<name>` (`golang.org/x/net/html` is in `golang.org/x/net`); on
 * `gopkg.in`, the host and the next segment (`gopkg.in/yaml.v3`). Any other path is taken whole.
 */
export function goModuleOfPath(path: string): string {
  const segments = path.split('/');
  const [host] = segments;
  let count = segments.length;
  if (OWNER_REPO_HOSTS.has(host)) count = MAJOR.test(segments[3] ?? '') && segments[3] !== 'v1' ? 4 : 3;
  else if (host === 'golang.org' && segments[1] === 'x') count = 3;
  else if (host === 'gopkg.in') count = 2;
  return segments.slice(0, count).join('/');
}

/** A Go requirement as `go.mod` writes it (`github.com/gin-gonic/gin v1.9.1`): the module path before its version. */
export const goRequirementName = (requirement: string) => requirement.trim().split(/\s+/)[0] ?? '';

/** A crate name as crates.io takes it: an ASCII letter, then ASCII letters, digits, `-` and `_`. */
const CRATE_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;

/** Whether a name is a crate name in any spelling crates.io takes (`serde_json`, `Serde-JSON`), 64 characters at most. */
export const isCrateName = (name: string) => name.length <= CRATE_NAME_MAX_LENGTH && CRATE_NAME.test(name);

/**
 * A crate's name the way crates.io compares names, and the way the site's addresses write it: lower case, each `-` a
 * `_` (`Serde-JSON` is `serde_json`). crates.io allows no two crates whose names differ only so.
 */
export const foldCrateName = (name: string) => name.toLowerCase().replaceAll('-', '_');

/** A Cargo requirement as `Cargo.toml` writes it (`serde = "1.0"`, `serde = { version = "1" }`): the name before `=`. */
export const crateRequirementName = (requirement: string) => requirement.replace(/=.*$/, '').trim();

/** A pub package name: lower-case letters, digits and `_`, not starting with a digit (a Dart identifier). */
const PUB_NAME = /^[a-z_][a-z0-9_]*$/;

/** Whether a name is a pub.dev package name, as written (lower case by rule), 64 characters at most. */
export const isPubName = (name: string) => name.length <= PUB_NAME_MAX_LENGTH && PUB_NAME.test(name);

/** A pub requirement as `pubspec.yaml` writes it (`http: ^1.2.0`): the name before `:`. */
export const pubRequirementName = (requirement: string) => requirement.replace(/:.*$/, '').trim();

/**
 * A Composer package name, `vendor/package`, by Composer's rule without case: the vendor's runs of letters and digits
 * joined by single `_`, `.` or `-`; the package's by single `_` or `.`, or one or two `-`.
 */
const COMPOSER_NAME = /^[a-z0-9]+(?:[_.-][a-z0-9]+)*\/[a-z0-9]+(?:(?:[_.]|--?)[a-z0-9]+)*$/i;

/**
 * Whether a name is a Packagist package name in any case Composer takes (`Laravel/Framework`), 255 characters at
 * most. A name with no `/` (a platform requirement such as `php` or `ext-json`) is none.
 */
export const isPackagistName = (name: string) => name.length <= PACKAGIST_NAME_MAX_LENGTH && COMPOSER_NAME.test(name);

/** A Packagist name the way Composer compares names, and the way the site's addresses write it: lower case. */
export const foldPackagistName = (name: string) => name.toLowerCase();

/**
 * A Composer requirement as written in `composer.json` or to `composer require` (`"laravel/framework": "^11.0"`,
 * `vendor/pkg:^2.0`, `vendor/pkg ^2.0`): the name before its version.
 */
export const packagistRequirementName = (requirement: string) =>
  requirement.replace(/["']/g, '').trim().split(/[\s:]/)[0] ?? '';

/** A `groupId` or an `artifactId` as Maven allows it, not dots alone. */
const MAVEN_PART = /^(?!\.+$)[A-Za-z0-9_.-]+$/;

/** Whether a name is a Maven Central artifact, `groupId:artifactId`, case kept, 500 characters at most. */
export function isMavenName(name: string): boolean {
  if (name.length > MAVEN_NAME_MAX_LENGTH) return false;
  const parts = name.split(':');
  return parts.length === 2 && parts.every((part) => MAVEN_PART.test(part));
}

/**
 * A Maven coordinate as written in a build file (`org.slf4j:slf4j-api:2.0.9`, Gradle's `implementation 'com.google.
 * guava:guava:33.0-jre'` and `implementation("com.google.guava:guava:33.0-jre")`): its `groupId:artifactId`, the
 * version and anything after it left out. Quotes and parentheses part words, so the configuration's name never joins
 * the coordinate.
 */
export const mavenRequirementName = (requirement: string) =>
  (
    requirement
      .replace(/["'()]/g, ' ')
      .trim()
      .split(/\s+/)
      .at(-1) ?? ''
  )
    .split(':')
    .slice(0, 2)
    .join(':');
