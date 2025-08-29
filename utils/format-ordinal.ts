const s = ['th', 'st', 'nd', 'rd'];

export const formatOrdinal = (k?: number | null) => {
  if (!k) {
    return undefined;
  }

  const v = k % 100;

  return k.toLocaleString('en-US') + (s[(v - 20) % 10] || s[v] || s[0]);
};
