/**
 * Parse a single HTTP Range header against a file size.
 * Returns null (serve the whole file), { start, end } (inclusive), or 'invalid' (416).
 * Multi-range requests ("bytes=0-1,5-6") get the whole file, which the spec allows.
 */
export function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header ?? '');
  if (!m || (!m[1] && !m[2])) return null;
  const start = m[1] ? +m[1] : Math.max(0, size - +m[2]); // "bytes=-500" = last 500 bytes
  const end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1;
  return start > end || start >= size ? 'invalid' : { start, end };
}
