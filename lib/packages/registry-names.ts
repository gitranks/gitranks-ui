// The name rules of the registries whose names need more than a pattern: Go's module paths, crates.io's, pub.dev's,
// Packagist's, Maven Central's, NuGet's and RubyGems'. Each is the registry's own rule, as a visitor's spelling is
// checked before any read; the folds are the registries' own, so every spelling a registry takes as one name has one
// address here.

/** The longest name the site takes for each of these registries. */
export const GO_NAME_MAX_LENGTH = 500;
export const CRATE_NAME_MAX_LENGTH = 64;
export const PUB_NAME_MAX_LENGTH = 64;
export const PACKAGIST_NAME_MAX_LENGTH = 255;
export const MAVEN_NAME_MAX_LENGTH = 500;
export const NUGET_NAME_MAX_LENGTH = 128;
export const GEM_NAME_MAX_LENGTH = 255;

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

/**
 * A Cargo requirement as `Cargo.toml` writes it (`serde = "1.0"`, `serde = { version = "1" }`): the name before its one
 * `=`. A comparison operator (`==`, `>=`, `~=`: a PyPI pin such as `django==5.0`) is not Cargo's, so it is left whole.
 */
export const crateRequirementName = (requirement: string) => requirement.replace(/(?<![=!<>~])=(?!=).*$/, '').trim();

/** A pub package name: lower-case letters, digits and `_`, not starting with a digit (a Dart identifier). */
const PUB_NAME = /^[a-z_][a-z0-9_]*$/;

/** Whether a name is a pub.dev package name, as written (lower case by rule), 64 characters at most. */
export const isPubName = (name: string) => name.length <= PUB_NAME_MAX_LENGTH && PUB_NAME.test(name);

/**
 * A pub requirement as `pubspec.yaml` writes it (`http: ^1.2.0`, `http: any`, `http:`): the name before its `:`. A `:`
 * with a word or `//` straight after it is no pubspec's (`https://…`, `maven:g:a`), so that text is left whole.
 */
export const pubRequirementName = (requirement: string) => requirement.replace(/:(?=$|[\s^<>=\d'"]).*$/s, '').trim();

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

/** A NuGet id: letters, digits and `_`, with single `.` or `-` between runs of them (NuGet's own rule), ASCII only. */
const NUGET_ID = /^[A-Za-z0-9_]+(?:[.-][A-Za-z0-9_]+)*$/;

/** Whether a name is a NuGet package id in any case nuget.org takes (`Newtonsoft.Json`), 128 characters at most. */
export const isNugetName = (name: string) => name.length <= NUGET_NAME_MAX_LENGTH && NUGET_ID.test(name);

/** A NuGet id the way nuget.org compares ids, and the way the site's addresses write it: lower case. */
export const foldNugetName = (name: string) => name.toLowerCase();

/**
 * The id in a package item of a project file or `Directory.Packages.props`, or a `packages.config` entry:
 * `<PackageReference Include="Serilog" />`, `<PackageVersion Update="Serilog" />`, `<package id="Serilog" />`. Only
 * these elements, so another item (`<Compile Include="Program.cs" />`) or a line such as `id = "org.jetbrains.kotlin.jvm"`
 * is not read as an id.
 */
const NUGET_ITEM =
  /^<\s*(?:PackageReference|PackageVersion|package)\b[^>]*?\b(?:Include|Update|id)\s*=\s*["']([^"']+)["']/i;
/**
 * The id after a command or directive that adds a package, as nuget.org's install tabs write them: `dotnet add
 * package`, `NuGet\Install-Package` (or `Install-Package`), `nuget install`, `paket add`, `#r "nuget: X, 1.0"`,
 * `#:package X@1.0`.
 */
const NUGET_COMMAND =
  /^(?:dotnet\s+add\s+(?:\S+\s+)?package|(?:NuGet\\)?Install-Package|nuget\s+install|paket\s+add|#r\s+"nuget:|#:package)\s*([^\s"',@]+)/i;

/**
 * A NuGet requirement as a project file, `packages.config` or a command writes it (`<PackageReference
 * Include="Newtonsoft.Json" Version="13.0.3" />`, `<package id="Serilog" version="3.1.1" />`, `dotnet add package
 * Serilog --version 3.1.1`): the id. Any other text is left whole, so another registry's spelling (`django==5.0`,
 * `vendor/pkg`) is never cut down to a NuGet id.
 */
export const nugetRequirementName = (requirement: string) => {
  const text = requirement.trim();
  return (NUGET_ITEM.exec(text) ?? NUGET_COMMAND.exec(text))?.[1] ?? text;
};

/** A gem name's characters (letters, digits, `.`, `_`, `-`), at least one letter among them, ASCII only. */
const GEM_NAME = /^[A-Za-z0-9._-]*[A-Za-z][A-Za-z0-9._-]*$/;

/**
 * Whether a name is a RubyGems gem name, as written (case kept: rubygems.org's lookups are case-sensitive, `ZenTest`):
 * rubygems.org's characters with at least one letter, or `-`, a gem it kept from before it asked for one; 255
 * characters at most.
 */
export const isGemName = (name: string) => name.length <= GEM_NAME_MAX_LENGTH && (GEM_NAME.test(name) || name === '-');

/** A Gemfile's `gem` line's name, or a gemspec dependency's: `gem 'rails', '~> 7.1'`, `s.add_dependency("rack")`. */
const GEM_DECLARATION = /^(?:gem|[\w.]*add_(?:runtime_|development_)?dependency)\s*\(?\s*["']([^"']+)["']/;
/** The name after a command that adds a gem: `gem install`, `bundle add`. */
const GEM_COMMAND = /^(?:gem\s+install|bundle\s+add)\s+([^\s"']+)/;
/** A `Gemfile.lock` line's name: `rails (7.1.0)`. */
const GEM_LOCK_LINE = /^([A-Za-z0-9._-]+)\s+\([^)]*\)$/;

/**
 * A RubyGems requirement as a Gemfile, a gemspec or a command writes it (`gem 'rails', '~> 7.1'`,
 * `spec.add_dependency "rack", ">= 2"`, `gem install rails -v 7.1.0`, a lockfile's `rails (7.1.0)`): the gem's name. Any other text is left whole,
 * so another registry's spelling (`serde = "1.0"`, `http: ^1.2.0`) is never cut down to a gem name.
 */
export const rubygemsRequirementName = (requirement: string) => {
  const text = requirement.trim();
  return (GEM_DECLARATION.exec(text) ?? GEM_COMMAND.exec(text) ?? GEM_LOCK_LINE.exec(text))?.[1] ?? text;
};
