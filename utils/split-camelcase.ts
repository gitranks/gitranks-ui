export function splitCamelCase(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2') // insert space before capital letters
    .replace(/^./, (char) => char.toUpperCase()); // capitalize first letter
}
