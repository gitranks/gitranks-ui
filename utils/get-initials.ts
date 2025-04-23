export function getInitials(input?: string): string {
  if (!input) return '';

  const words = input.trim().split(/\s+/); // split by any whitespace

  if (words.length === 0) return '';

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
