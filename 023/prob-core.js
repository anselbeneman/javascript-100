(function attachProbCore(global) {
  function makeRng(seed) {
    let state = (seed >>> 0) || 1;
    return function random() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function hashString(value, seed) {
    let hash = (2166136261 ^ seed) >>> 0;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 2246822507) >>> 0;
    hash ^= hash >>> 13;
    return hash >>> 0;
  }

  function createStream(options = {}) {
    const count = Math.max(32, Math.round(options.count || 2400));
    const duplicateRate = Math.min(0.85, Math.max(0, Number(options.duplicateRate || 0.18)));
    const random = makeRng(options.seed || 23);
    const seen = [];
    const items = [];

    for (let index = 0; index < count; index += 1) {
      if (seen.length && random() < duplicateRate) {
        items.push(seen[Math.floor(random() * seen.length)]);
      } else {
        const item = `item-${index}-${Math.floor(random() * 1e9).toString(36)}`;
        seen.push(item);
        items.push(item);
      }
    }

    return items;
  }

  function createBloom(size, hashes) {
    return { bits: new Uint8Array(size), size, hashes, inserts: 0 };
  }

  function bloomIndexes(value, bloom) {
    const h1 = hashString(value, 101);
    const h2 = hashString(value, 997) || 1;
    const indexes = [];
    for (let index = 0; index < bloom.hashes; index += 1) {
      indexes.push((h1 + index * h2) % bloom.size);
    }
    return indexes;
  }

  function bloomAdd(bloom, value) {
    bloomIndexes(value, bloom).forEach((index) => { bloom.bits[index] = 1; });
    bloom.inserts += 1;
  }

  function bloomHas(bloom, value) {
    return bloomIndexes(value, bloom).every((index) => bloom.bits[index] === 1);
  }

  function createHll(precision) {
    const p = Math.max(4, Math.min(14, Math.round(precision || 8)));
    return { precision: p, registers: new Uint8Array(1 << p), inserts: 0 };
  }

  function leadingZeros32(value) {
    return Math.clz32(value) + 1;
  }

  function hllAdd(hll, value) {
    const hash = hashString(value, 4099);
    const index = hash >>> (32 - hll.precision);
    const remaining = (hash << hll.precision) >>> 0;
    hll.registers[index] = Math.max(hll.registers[index], leadingZeros32(remaining));
    hll.inserts += 1;
  }

  function hllEstimate(hll) {
    const m = hll.registers.length;
    const alpha = m === 16 ? 0.673 : m === 32 ? 0.697 : m === 64 ? 0.709 : 0.7213 / (1 + 1.079 / m);
    let sum = 0;
    let zeros = 0;
    hll.registers.forEach((value) => {
      sum += Math.pow(2, -value);
      if (value === 0) zeros += 1;
    });
    let estimate = alpha * m * m / sum;
    if (estimate <= 2.5 * m && zeros > 0) estimate = m * Math.log(m / zeros);
    return estimate;
  }

  function analyze(options = {}) {
    const items = createStream(options);
    const unique = new Set(items);
    const bloom = createBloom(Math.max(128, Math.round(options.bloomSize || 8192)), Math.max(2, Math.round(options.hashes || 5)));
    const hll = createHll(options.precision || 8);

    items.forEach((item) => {
      bloomAdd(bloom, item);
      hllAdd(hll, item);
    });

    const random = makeRng((options.seed || 23) + 5000);
    const probes = Math.max(200, Math.round(options.probes || 1200));
    let falsePositives = 0;
    for (let index = 0; index < probes; index += 1) {
      const item = `probe-${index}-${Math.floor(random() * 1e9).toString(36)}`;
      if (bloomHas(bloom, item)) falsePositives += 1;
    }

    const setBits = bloom.bits.reduce((sum, bit) => sum + bit, 0);
    const estimate = hllEstimate(hll);
    const actual = unique.size;

    return {
      bloom,
      hll,
      metrics: {
        streamCount: items.length,
        uniqueCount: actual,
        bloomBits: bloom.size,
        bloomFill: setBits / bloom.size,
        falsePositiveRate: falsePositives / probes,
        probes,
        hllRegisters: hll.registers.length,
        hllEstimate: estimate,
        hllError: Math.abs(estimate - actual) / actual,
        memoryBytes: bloom.bits.length + hll.registers.length,
      },
    };
  }

  function benchmarkAnalyze(options = {}) {
    const iterations = Math.max(1, Math.round(options.iterations || 10));
    const started = Date.now();
    let result = null;
    for (let index = 0; index < iterations; index += 1) {
      result = analyze({ ...options, seed: (options.seed || 23) + index });
    }
    return { iterations, averageMs: (Date.now() - started) / iterations, lastMetrics: result ? result.metrics : null };
  }

  const api = { analyze, benchmarkAnalyze, bloomAdd, bloomHas, createBloom, createHll, createStream, hashString, hllAdd, hllEstimate, makeRng };
  global.ProbCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
