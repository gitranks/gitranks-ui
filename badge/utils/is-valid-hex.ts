export const isValidHex = (v: string) => /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(v.trim());
