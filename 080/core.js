(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createRng(seed) {
    let state = (seed >>> 0) || 1;
    return function rng() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function hashA(key, size) {
    let hash = 2166136261;
    for (let i = 0; i < key.length; i += 1) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
    return (hash >>> 0) % size;
  }

  function hashB(key, size) {
    let hash = 5381;
    for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
    return (hash >>> 0) % size;
  }

  function insert(tableA, tableB, key) {
    let current = key;
    let table = 0;
    for (let kick = 0; kick < 80; kick += 1) {
      if (table === 0) {
        const index = hashA(current, tableA.length);
        if (!tableA[index]) { tableA[index] = current; return true; }
        [tableA[index], current] = [current, tableA[index]];
        table = 1;
      } else {
        const index = hashB(current, tableB.length);
        if (!tableB[index]) { tableB[index] = current; return true; }
        [tableB[index], current] = [current, tableB[index]];
        table = 0;
      }
    }
    return false;
  }

  function contains(tableA, tableB, key) {
    return tableA[hashA(key, tableA.length)] === key || tableB[hashB(key, tableB.length)] === key;
  }

  function analyze(options) {
    const seed = Math.floor((options && options.seed) || 80);
    const size = clamp(Math.floor((options && options.size) || 420), 160, 1200);
    const count = clamp(Math.floor(size / 10), 24, 96);
    const tableSize = Math.ceil(count * 1.45);
    const tableA = Array(tableSize).fill('');
    const tableB = Array(tableSize).fill('');
    const keys = Array.from({ length: count }, (_, index) => 'K' + seed + '-' + index + '-' + ((index * 17) % 101));
    const inserted = keys.filter((key) => insert(tableA, tableB, key));
    const verified = inserted.length === keys.length && keys.every((key) => contains(tableA, tableB, key));
    const occupied = tableA.concat(tableB).filter(Boolean).length;
    return {
      points: tableA.concat(tableB).map((key, index) => ({ x: (index % tableSize) / (tableSize - 1), y: index < tableSize ? 0.35 : 0.65, r: key ? 4 : 2 })),
      links: [],
      path: [],
      series: [occupied, tableA.filter(Boolean).length, tableB.filter(Boolean).length],
      metrics: {
        items: keys.length,
        score: occupied,
        extra: tableSize * 2,
        verified,
      },
    };
  }

  function benchmark(options) {
    const runs = options.runs || 8;
    const start = performance.now();
    for (let i = 0; i < runs; i += 1) {
      analyze(options);
    }
    return { runs, avgMs: (performance.now() - start) / runs };
  }

  window.ProjectCore = { analyze, benchmark, contains, insert };
}());
