import v8 from 'v8';

export function writeHeapSnapshot() {
  const file = `/tmp/heap-${Date.now()}.heapsnapshot`;
  v8.writeHeapSnapshot(file);
  console.log('Heap snapshot saved:', file);
  return file;
}
