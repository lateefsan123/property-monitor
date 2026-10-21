// Store-only ZIP. Excel files are already compressed. No remote libraries/code.
const encoder = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let n = i;
  for (let bit = 0; bit < 8; bit++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function block(size, fields) {
  const bytes = new Uint8Array(size), view = new DataView(bytes.buffer);
  for (const [offset, value, width] of fields) width === 2 ? view.setUint16(offset, value, true) : view.setUint32(offset, value, true);
  return bytes;
}
export function zipFiles(files) {
  if (files.length > 65535) throw new Error('Choose fewer buildings for one download.');
  const body = [], directory = [];
  let offset = 0, directorySize = 0;
  for (const file of files) {
    const name = encoder.encode(file.name), data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const crc = crc32(data), size = data.length;
    body.push(block(30, [[0, 0x04034b50], [4, 20, 2], [6, 0x800, 2], [12, 33, 2], [14, crc], [18, size], [22, size], [26, name.length, 2]]), name, data);
    directory.push(block(46, [[0, 0x02014b50], [4, 20, 2], [6, 20, 2], [8, 0x800, 2], [14, 33, 2], [16, crc], [20, size], [24, size], [28, name.length, 2], [42, offset]]), name);
    offset += 30 + name.length + size;
    directorySize += 46 + name.length;
  }
  if (offset + directorySize > 0xffffffff) throw new Error('Download is too large. Select fewer buildings.');
  const parts = [...body, ...directory, block(22, [[0, 0x06054b50], [8, files.length, 2], [10, files.length, 2], [12, directorySize], [16, offset]])];
  const result = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let cursor = 0;
  for (const part of parts) { result.set(part, cursor); cursor += part.length; }
  return result;
}
