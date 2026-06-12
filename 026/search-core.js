(function attachSearchCore(global) {
  const corpus = [
    'ray tracing studio renders reflective spheres with path sampled lighting',
    'fluid simulation solves pressure projection and vorticity fields',
    'neural network playground trains classifiers with gradient descent',
    'bytecode virtual machine compiles expressions into stack instructions',
    'granular synth lab schedules grains and analyzes spectra',
    'delaunay mesh lab triangulates point clouds with circumcircle tests',
    'kalman filter lab fuses noisy sensor measurements into smooth trajectories',
    'genetic route optimizer evolves traveling salesperson tours',
    'wave equation lab propagates pulses through finite difference grids',
    'sdf ray marcher renders procedural signed distance geometry',
    'monte carlo tree search evaluates game moves through rollouts',
    'exact cover sudoku models constraints with algorithm x backtracking',
  ];

  function tokenize(text) {
    return String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
  }

  function buildIndex(documents) {
    const docs = documents.map((text, id) => {
      const tokens = tokenize(text);
      const freq = new Map();
      tokens.forEach((token) => freq.set(token, (freq.get(token) || 0) + 1));
      return { id, text, tokens, freq };
    });
    const index = new Map();
    docs.forEach((doc) => {
      doc.freq.forEach((count, token) => {
        if (!index.has(token)) index.set(token, []);
        index.get(token).push({ docId: doc.id, count });
      });
    });
    return {
      docs,
      index,
      avgLength: docs.reduce((sum, doc) => sum + doc.tokens.length, 0) / docs.length,
    };
  }

  function idf(totalDocs, documentFrequency) {
    return Math.log(1 + (totalDocs - documentFrequency + 0.5) / (documentFrequency + 0.5));
  }

  function scoreDocument(searchIndex, doc, queryTokens, options = {}) {
    const k1 = Number(options.k1 || 1.45);
    const b = Number(options.b || 0.72);
    let score = 0;
    const terms = [];
    queryTokens.forEach((token) => {
      const postings = searchIndex.index.get(token) || [];
      const posting = postings.find((entry) => entry.docId === doc.id);
      if (!posting) return;
      const termIdf = idf(searchIndex.docs.length, postings.length);
      const numerator = posting.count * (k1 + 1);
      const denominator = posting.count + k1 * (1 - b + b * doc.tokens.length / searchIndex.avgLength);
      const contribution = termIdf * numerator / denominator;
      score += contribution;
      terms.push({ token, count: posting.count, idf: termIdf, contribution });
    });
    return { docId: doc.id, score, terms, text: doc.text };
  }

  function search(searchIndex, query, options = {}) {
    const queryTokens = [...new Set(tokenize(query))];
    return searchIndex.docs
      .map((doc) => scoreDocument(searchIndex, doc, queryTokens, options))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.round(options.limit || 6)));
  }

  function analyze(options = {}) {
    const documents = options.documents || corpus;
    const query = options.query || 'procedural rendering geometry';
    const searchIndex = buildIndex(documents);
    const results = search(searchIndex, query, options);
    return {
      searchIndex,
      query,
      results,
      metrics: {
        documents: searchIndex.docs.length,
        vocabulary: searchIndex.index.size,
        avgLength: searchIndex.avgLength,
        queryTerms: tokenize(query).length,
        hits: results.length,
        topScore: results[0] ? results[0].score : 0,
      },
    };
  }

  function benchmark(options = {}) {
    const iterations = Math.max(1, Math.round(options.iterations || 120));
    const started = Date.now();
    let result = null;
    for (let index = 0; index < iterations; index += 1) result = analyze(options);
    return { iterations, averageMs: (Date.now() - started) / iterations, lastMetrics: result.metrics };
  }

  const api = { analyze, benchmark, buildIndex, corpus, idf, scoreDocument, search, tokenize };
  global.SearchCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
