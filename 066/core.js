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

  function buildNetwork(options) {
    const seed = Math.floor(options.seed || 66);
    const size = clamp(Math.floor(options.size || 420), 160, 1200);
    const rng = createRng(seed);
    const middleLayers = 4;
    const width = clamp(Math.floor(size / 120) + 3, 4, 9);
    const layers = [[0]];
    const points = [{ x: 0.06, y: 0.5, r: 7 }];
    let cursor = 1;

    for (let layer = 1; layer <= middleLayers; layer += 1) {
      const count = width + ((seed + layer) % 3) - 1;
      const ids = [];
      for (let i = 0; i < count; i += 1) {
        const y = (i + 1) / (count + 1) + (rng() - 0.5) * 0.045;
        points.push({ x: 0.1 + layer * 0.18, y: clamp(y, 0.08, 0.92), r: 5 });
        ids.push(cursor);
        cursor += 1;
      }
      layers.push(ids);
    }

    const sink = cursor;
    points.push({ x: 0.94, y: 0.5, r: 7 });
    layers.push([sink]);

    const edges = [];
    function addEdge(from, to, base) {
      const capacity = Math.max(1, Math.floor(base + rng() * 18 + ((from + to + seed) % 9)));
      edges.push({ from, to, capacity });
    }

    for (let layer = 0; layer < layers.length - 1; layer += 1) {
      const current = layers[layer];
      const next = layers[layer + 1];
      current.forEach((from, index) => {
        const fanout = Math.min(next.length, 2 + ((from + seed) % 2));
        for (let k = 0; k < fanout; k += 1) {
          const to = next[(index + k + layer) % next.length];
          addEdge(from, to, 6 + layer * 2);
        }
      });
      next.forEach((to, index) => {
        const from = current[(index + seed + layer) % current.length];
        if (!edges.some((edge) => edge.from === from && edge.to === to)) {
          addEdge(from, to, 5 + layer * 2);
        }
      });
    }

    for (let layer = 1; layer < layers.length - 2; layer += 1) {
      layers[layer].forEach((from, index) => {
        if (rng() > 0.52) {
          const jump = layers[layer + 2];
          addEdge(from, jump[(index + seed) % jump.length], 3 + layer);
        }
      });
    }

    return { nodes: points.length, source: 0, sink, points, edges };
  }

  function edmondsKarp(network) {
    const residual = Array.from({ length: network.nodes }, () => []);
    const forwardRefs = [];

    function addResidualEdge(from, to, capacity) {
      const forward = { to, rev: residual[to].length, cap: capacity, original: forwardRefs.length };
      const reverse = { to: from, rev: residual[from].length, cap: 0, original: -1 };
      residual[from].push(forward);
      residual[to].push(reverse);
      forwardRefs.push({ from, to, capacity, edge: forward });
    }

    network.edges.forEach((edge) => addResidualEdge(edge.from, edge.to, edge.capacity));

    const augmentingPaths = [];
    let maxFlow = 0;

    while (true) {
      const parent = Array(network.nodes).fill(null);
      parent[network.source] = { node: -1, edge: -1 };
      const queue = [network.source];

      for (let head = 0; head < queue.length && !parent[network.sink]; head += 1) {
        const node = queue[head];
        residual[node].forEach((edge, edgeIndex) => {
          if (!parent[edge.to] && edge.cap > 0) {
            parent[edge.to] = { node, edge: edgeIndex };
            queue.push(edge.to);
          }
        });
      }

      if (!parent[network.sink]) {
        break;
      }

      let bottleNeck = Infinity;
      const path = [];
      for (let node = network.sink; node !== network.source; node = parent[node].node) {
        const step = parent[node];
        const edge = residual[step.node][step.edge];
        bottleNeck = Math.min(bottleNeck, edge.cap);
        path.push(node);
      }
      path.push(network.source);
      path.reverse();

      for (let node = network.sink; node !== network.source; node = parent[node].node) {
        const step = parent[node];
        const edge = residual[step.node][step.edge];
        edge.cap -= bottleNeck;
        residual[edge.to][edge.rev].cap += bottleNeck;
      }

      maxFlow += bottleNeck;
      augmentingPaths.push({ path, bottleNeck });
    }

    const reachable = new Set([network.source]);
    const queue = [network.source];
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      residual[node].forEach((edge) => {
        if (edge.cap > 0 && !reachable.has(edge.to)) {
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      });
    }

    const flows = forwardRefs.map((ref) => ({
      from: ref.from,
      to: ref.to,
      capacity: ref.capacity,
      flow: ref.capacity - ref.edge.cap,
    }));

    const balance = Array(network.nodes).fill(0);
    let capacityOk = true;
    flows.forEach((edge) => {
      if (edge.flow < 0 || edge.flow > edge.capacity) {
        capacityOk = false;
      }
      balance[edge.from] -= edge.flow;
      balance[edge.to] += edge.flow;
    });

    const conservationOk = balance.every((value, index) => (
      index === network.source || index === network.sink || Math.abs(value) < 1e-9
    ));
    const noResidualPath = !reachable.has(network.sink);

    return {
      maxFlow,
      augmentingPaths,
      reachable,
      flows,
      verified: capacityOk
        && conservationOk
        && noResidualPath
        && Math.abs(-balance[network.source] - maxFlow) < 1e-9
        && Math.abs(balance[network.sink] - maxFlow) < 1e-9,
    };
  }

  function analyze(options) {
    const network = buildNetwork(options || {});
    const solution = edmondsKarp(network);
    const links = solution.flows.map((edge) => [edge.from, edge.to, edge.capacity ? edge.flow / edge.capacity : 0]);
    const path = solution.augmentingPaths.length
      ? solution.augmentingPaths[solution.augmentingPaths.length - 1].path
      : [];
    const series = solution.flows
      .slice()
      .sort((a, b) => (b.flow / b.capacity) - (a.flow / a.capacity))
      .slice(0, 24)
      .map((edge) => edge.capacity ? edge.flow / edge.capacity : 0);

    return {
      points: network.points,
      links,
      path,
      series,
      metrics: {
        items: network.edges.length,
        score: solution.maxFlow,
        extra: solution.augmentingPaths.length,
        verified: solution.verified,
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

  window.ProjectCore = { analyze, benchmark, buildNetwork, edmondsKarp };
}());
