// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatBytes(bytes?: any, decimals = 2): string {
  if (typeof bytes !== 'number') return '';

  if (bytes === 0) return '0 Bytes';

  const k = 1024; // size in bytes
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))?.toLocaleString('en-US') + ' ' + sizes[i];
}
