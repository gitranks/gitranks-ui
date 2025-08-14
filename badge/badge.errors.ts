export class NotFoundError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class InvalidScoreError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidScoreError';
  }
}

export class InvalidCountryError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'InvalidCountryError';
  }
}

export class RanksAreNotAvailableError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'RanksAreNotAvailableError';
  }
}

export class TiersAreNotAvailableError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'TiersAreNotAvailableError';
  }
}
