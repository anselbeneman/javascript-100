(function () {
  'use strict';
  function table() { const crc = new Uint32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc[n] = c >>> 0; } return crc; }
  const crcTable = table();
  function crc32(text, seed = 0 ^ -1) { let crc = seed; for (let i = 0; i < text.length; i += 1) crc = (crc >>> 8) ^ crcTable[(crc ^ text.charCodeAt(i)) & 0xff]; return crc >>> 0; }
  function analyze(options) { const size = Math.max(32, Math.floor(options.size || 180)); const text = Array(Math.ceil(size / 18)).fill('javascript-100-').join('').slice(0, size); const full = (crc32(text) ^ -1) >>> 0; let state = 0 ^ -1; const chunks = []; for (let i = 0; i < text.length; i += 9) { state = crc32(text.slice(i, i + 9), state); chunks.push(state >>> 0); } const incremental = (state ^ -1) >>> 0; return { series: chunks.slice(-40).map((value) => value % 997), metrics: { items: text.length, score: full % 100000, extra: chunks.length, verified: full === incremental } }; }
  function benchmark(options) { const runs = options.runs || 8; const start = performance.now(); for (let i = 0; i < runs; i += 1) analyze(options); return { runs, avgMs: (performance.now() - start) / runs }; }
  window.ProjectCore = { analyze, benchmark, crc32 };
}());
