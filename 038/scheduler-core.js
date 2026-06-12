(function () {
  'use strict';

  function mulberry32(seed) {
    let state = seed >>> 0;
    return function random() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function buildDag(options = {}) {
    const count = Math.max(6, Math.min(32, Math.floor(options.count || 16)));
    const density = Math.max(0.08, Math.min(0.44, Number(options.density ?? 0.22)));
    const random = mulberry32(options.seed || 38);
    const nodes = Array.from({ length: count }, (_, index) => ({
      id: `T${index + 1}`,
      duration: 1 + Math.floor(random() * 8),
      layer: Math.floor(index / Math.max(1, Math.ceil(count / 4))),
    }));
    const edges = [];

    for (let index = 0; index < count - 1; index += 1) {
      edges.push({ from: nodes[index].id, to: nodes[index + 1].id });
    }

    for (let from = 0; from < count; from += 1) {
      for (let to = from + 2; to < count; to += 1) {
        if (random() < density) {
          edges.push({ from: nodes[from].id, to: nodes[to].id });
        }
      }
    }

    return { nodes, edges };
  }

  function topologicalSort(graph) {
    const indegree = new Map(graph.nodes.map((node) => [node.id, 0]));
    const outgoing = new Map(graph.nodes.map((node) => [node.id, []]));
    graph.edges.forEach((edge) => {
      indegree.set(edge.to, indegree.get(edge.to) + 1);
      outgoing.get(edge.from).push(edge.to);
    });
    const queue = [...indegree.entries()].filter((entry) => entry[1] === 0).map((entry) => entry[0]).sort();
    const order = [];

    while (queue.length > 0) {
      const id = queue.shift();
      order.push(id);
      outgoing.get(id).forEach((to) => {
        indegree.set(to, indegree.get(to) - 1);
        if (indegree.get(to) === 0) {
          queue.push(to);
          queue.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        }
      });
    }

    return { order, hasCycle: order.length !== graph.nodes.length };
  }

  function criticalPath(graph, order) {
    const duration = new Map(graph.nodes.map((node) => [node.id, node.duration]));
    const earliest = new Map(graph.nodes.map((node) => [node.id, 0]));
    const previous = new Map();
    const outgoing = new Map(graph.nodes.map((node) => [node.id, []]));
    graph.edges.forEach((edge) => outgoing.get(edge.from).push(edge.to));

    order.forEach((id) => {
      const finish = earliest.get(id) + duration.get(id);
      outgoing.get(id).forEach((to) => {
        if (finish > earliest.get(to)) {
          earliest.set(to, finish);
          previous.set(to, id);
        }
      });
    });

    let end = order[0];
    let bestFinish = 0;
    order.forEach((id) => {
      const finish = earliest.get(id) + duration.get(id);
      if (finish > bestFinish) {
        bestFinish = finish;
        end = id;
      }
    });

    const path = [];
    while (end) {
      path.push(end);
      end = previous.get(end);
    }

    return { earliest, path: path.reverse(), totalDuration: bestFinish };
  }

  function validateOrder(graph, order) {
    const position = new Map(order.map((id, index) => [id, index]));
    return graph.edges.every((edge) => position.get(edge.from) < position.get(edge.to));
  }

  function analyze(options = {}) {
    const graph = buildDag(options);
    const topo = topologicalSort(graph);
    const critical = criticalPath(graph, topo.order);
    return {
      ...graph,
      order: topo.order,
      criticalPath: critical.path,
      earliest: Object.fromEntries(critical.earliest.entries()),
      metrics: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        hasCycle: topo.hasCycle,
        validOrder: validateOrder(graph, topo.order),
        criticalDuration: critical.totalDuration,
        criticalNodes: critical.path.length,
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(100, Math.floor(options.runs || 24)));
    const started = performance.now();
    let edges = 0;
    let duration = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ ...options, seed: (options.seed || 38) + index });
      edges += result.metrics.edges;
      duration += result.metrics.criticalDuration;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgEdges: edges / runs, avgDuration: duration / runs };
  }

  window.SchedulerCore = {
    analyze,
    benchmark,
    buildDag,
    criticalPath,
    topologicalSort,
    validateOrder,
  };
}());
