export const pluralize = (word: string, count: number): string => {
  return `${word}${count !== 1 ? 's' : ''}`;
};
