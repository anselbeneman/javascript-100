(function attachMctsCore(global) {
  function makeRng(seed) {
    let state = (seed >>> 0) || 1;
    return function random() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function cloneState(state) {
    return {
      board: state.board.slice(),
      player: state.player,
      winner: state.winner,
    };
  }

  function createState(board) {
    return {
      board: board ? board.slice() : Array(9).fill(0),
      player: 1,
      winner: 0,
    };
  }

  const wins = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];

  function evaluateWinner(board) {
    for (let index = 0; index < wins.length; index += 1) {
      const [a, b, c] = wins[index];
      const value = board[a];
      if (value !== 0 && value === board[b] && value === board[c]) return value;
    }
    return board.includes(0) ? 0 : 2;
  }

  function legalMoves(state) {
    if (state.winner) return [];
    return state.board
      .map((value, index) => (value === 0 ? index : -1))
      .filter((index) => index >= 0);
  }

  function applyMove(state, move) {
    const next = cloneState(state);
    next.board[move] = state.player;
    next.winner = evaluateWinner(next.board);
    next.player = state.player === 1 ? -1 : 1;
    return next;
  }

  function createNode(state, parent, move) {
    return {
      id: 0,
      state,
      parent,
      move,
      children: [],
      untried: legalMoves(state),
      visits: 0,
      wins: 0,
      depth: parent ? parent.depth + 1 : 0,
    };
  }

  function ucbScore(node, exploration) {
    if (node.visits === 0) return Infinity;
    return node.wins / node.visits + exploration * Math.sqrt(Math.log(node.parent.visits) / node.visits);
  }

  function selectNode(root, exploration) {
    let node = root;
    while (node.untried.length === 0 && node.children.length > 0) {
      node = node.children.reduce((best, child) => (
        ucbScore(child, exploration) > ucbScore(best, exploration) ? child : best
      ), node.children[0]);
    }
    return node;
  }

  function expandNode(node, random) {
    if (node.untried.length === 0) return node;
    const index = Math.floor(random() * node.untried.length);
    const move = node.untried.splice(index, 1)[0];
    const child = createNode(applyMove(node.state, move), node, move);
    node.children.push(child);
    return child;
  }

  function rollout(state, random) {
    let current = cloneState(state);
    while (!current.winner) {
      const moves = legalMoves(current);
      const move = moves[Math.floor(random() * moves.length)];
      current = applyMove(current, move);
    }
    return current.winner;
  }

  function backpropagate(node, winner, rootPlayer) {
    let current = node;
    while (current) {
      current.visits += 1;
      if (winner === 2) current.wins += 0.5;
      else if (winner === rootPlayer) current.wins += 1;
      current = current.parent;
    }
  }

  function collectNodes(root) {
    const nodes = [];
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      node.id = nodes.length;
      nodes.push(node);
      node.children.forEach((child) => stack.push(child));
    }
    return nodes;
  }

  function runSearch(options = {}) {
    const random = makeRng(options.seed || 22);
    const root = createNode(createState(options.board), null, null);
    const rootPlayer = root.state.player;
    const iterations = Math.max(1, Math.round(options.iterations || 1200));
    const exploration = Number(options.exploration || 1.41);
    const winsByResult = { x: 0, o: 0, draw: 0 };

    for (let index = 0; index < iterations; index += 1) {
      let node = selectNode(root, exploration);
      node = expandNode(node, random);
      const winner = rollout(node.state, random);
      if (winner === 1) winsByResult.x += 1;
      else if (winner === -1) winsByResult.o += 1;
      else winsByResult.draw += 1;
      backpropagate(node, winner, rootPlayer);
    }

    const nodes = collectNodes(root);
    const bestChild = root.children.slice().sort((a, b) => b.visits - a.visits)[0] || null;
    const deepest = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

    return {
      root,
      nodes,
      bestMove: bestChild ? bestChild.move : null,
      metrics: {
        iterations,
        nodes: nodes.length,
        deepest,
        rootVisits: root.visits,
        bestMove: bestChild ? bestChild.move : -1,
        bestVisits: bestChild ? bestChild.visits : 0,
        bestWinRate: bestChild && bestChild.visits ? bestChild.wins / bestChild.visits : 0,
        branching: root.children.length,
        xWins: winsByResult.x,
        oWins: winsByResult.o,
        draws: winsByResult.draw,
      },
    };
  }

  function benchmarkSearch(options = {}) {
    const iterations = Math.max(1, Math.round(options.benchmarkIterations || 8));
    const started = Date.now();
    let result = null;
    for (let index = 0; index < iterations; index += 1) {
      result = runSearch({ ...options, seed: (options.seed || 22) + index });
    }
    return {
      iterations,
      averageMs: (Date.now() - started) / iterations,
      lastMetrics: result ? result.metrics : null,
    };
  }

  const api = {
    applyMove,
    benchmarkSearch,
    createState,
    evaluateWinner,
    legalMoves,
    makeRng,
    runSearch,
  };

  global.MctsCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
