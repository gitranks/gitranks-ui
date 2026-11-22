/** The longest project name the site takes for PyPI. */
export const PYPI_NAME_MAX_LENGTH = 214;

/** ASCII letters and digits, with `.`, `_` and `-` inside only: PyPI's rule for a project's name, in any letter case. */
const PROJECT_NAME = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i;

/**
 * Whether `name` can name a project on PyPI, by PyPI's own rule for project names: 1 to 214 ASCII letters and digits,
 * with `.`, `_` and `-` between them, starting and ending with a letter or a digit, in any letter case.
 */
export const isPypiProjectName = (name: string) => name.length <= PYPI_NAME_MAX_LENGTH && PROJECT_NAME.test(name);

/**
 * A project's name the way PyPI compares names, and the way the site's addresses write it: lower case, each run of
 * `-`, `_` and `.` one `-`. `Django`, `zope.interface` and `Zope__Interface` are `django`, `zope-interface` and
 * `zope-interface`.
 */
export const foldPypiName = (name: string) => name.toLowerCase().replace(/[-_.]+/g, '-');

/**
 * The project's name in a requirement as written in a requirements file or `pip install` (`django==5.0`,
 * `requests[socks]>=2`, `numpy; python_version>"3.8"`): what comes before its extras, its version specifier or its
 * environment marker.
 */
export const pypiRequirementName = (requirement: string) => requirement.replace(/[[=<>!~;].*$/, '');
