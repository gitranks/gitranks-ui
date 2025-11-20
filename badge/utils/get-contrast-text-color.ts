export function getContrastTextColor(bgColor: string): 'black' | 'white' {
  // Handle undefined/null/empty values
  if (!bgColor || typeof bgColor !== 'string') {
    return 'black'; // Default to black text on white background
  }

  // Remove '#' if present
  let hex = bgColor.replace('#', '');

  // Expand shorthand form (e.g. "03F") to full form ("0033FF")
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance (sRGB)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // If luminance is high → use black; otherwise, use white
  return luminance > 0.5 ? 'black' : 'white';
}

export function getTextShadow(bgColor: string): string {
  const textColor = getContrastTextColor(bgColor);
  return textColor === 'black' ? 'none' : '0 1px 0 rgba(0, 0, 0, 0.3)';
}
