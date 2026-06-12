(function () {
  'use strict';

  const samples = {
    telemetry: 'render samples samples samples ray ray tracer tracer tracer worker canvas canvas adaptive progressive progressive benchmark metrics metrics metrics',
    portfolio: 'javascript portfolio project project client landing responsive responsive accessible fast fast fast deploy deploy validate validate',
    systems: 'heap graph graph parser parser parser signal signal signal compression compression compression deterministic deterministic deterministic',
  };

  function frequencies(text) {
    const counts = new Map();
    for (const char of text) {
      counts.set(char, (counts.get(char) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([char, count]) => ({ char, count }))
      .sort((a, b) => b.count - a.count || a.char.localeCompare(b.char));
  }

  function createQueue(items) {
    return items
      .map((item) => ({ char: item.char, count: item.count, left: null, right: null, order: item.char.charCodeAt(0) }))
      .sort((a, b) => a.count - b.count || a.order - b.order);
  }

  function insert(queue, node) {
    queue.push(node);
    queue.sort((a, b) => a.count - b.count || a.order - b.order);
  }

  function buildTree(text) {
    const queue = createQueue(frequencies(text));
    if (queue.length === 0) return null;
    if (queue.length === 1) {
      return { char: null, count: queue[0].count, left: queue[0], right: null, order: queue[0].order };
    }

    let order = 100000;
    while (queue.length > 1) {
      const left = queue.shift();
      const right = queue.shift();
      insert(queue, {
        char: null,
        count: left.count + right.count,
        left,
        right,
        order: order += 1,
      });
    }

    return queue[0];
  }

  function buildCodes(tree, prefix = '', output = {}) {
    if (!tree) return output;
    if (tree.char !== null) {
      output[tree.char] = prefix || '0';
      return output;
    }
    buildCodes(tree.left, `${prefix}0`, output);
    buildCodes(tree.right, `${prefix}1`, output);
    return output;
  }

  function encode(text, codes) {
    let bits = '';
    for (const char of text) {
      bits += codes[char];
    }
    return bits;
  }

  function decode(bits, tree) {
    if (!tree) return '';
    let node = tree;
    let text = '';
    for (const bit of bits) {
      node = bit === '0' ? node.left : node.right;
      if (node && node.char !== null) {
        text += node.char;
        node = tree;
      }
    }
    return text;
  }

  function depth(tree) {
    if (!tree) return 0;
    if (tree.char !== null) return 1;
    return 1 + Math.max(depth(tree.left), depth(tree.right));
  }

  function analyze(options = {}) {
    const text = options.text || samples[options.sample || 'telemetry'] || samples.telemetry;
    const tree = buildTree(text);
    const codes = buildCodes(tree);
    const bits = encode(text, codes);
    const decoded = decode(bits, tree);
    const freq = frequencies(text);
    const fixedWidth = Math.max(1, Math.ceil(Math.log2(freq.length || 1)));
    const fixedBits = text.length * fixedWidth;

    return {
      text,
      frequencies: freq,
      tree,
      codes,
      bits,
      decoded,
      metrics: {
        symbols: text.length,
        uniqueSymbols: freq.length,
        encodedBits: bits.length,
        fixedBits,
        ratio: fixedBits > 0 ? bits.length / fixedBits : 0,
        treeDepth: depth(tree),
        decodedMatches: decoded === text,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(100, Math.floor(options.runs || 30)));
    const names = Object.keys(samples);
    const started = performance.now();
    let last = null;
    for (let index = 0; index < runs; index += 1) {
      last = analyze({ sample: names[index % names.length] });
    }
    return { runs, avgMs: (performance.now() - started) / runs, ratio: last.metrics.ratio, uniqueSymbols: last.metrics.uniqueSymbols };
  }

  window.HuffmanCore = {
    analyze,
    benchmark,
    buildCodes,
    buildTree,
    decode,
    depth,
    encode,
    frequencies,
    samples,
  };
}());
