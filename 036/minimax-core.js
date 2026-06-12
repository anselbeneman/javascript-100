(function () {
  'use strict';

  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  const presets = {
    attack: ['X', 'X', '.', 'O', 'O', '.', '.', '.', '.'],
    fork: ['O', '.', '.', '.', 'X', '.', '.', '.', 'X'],
    defense: ['O', 'O', '.', '.', 'X', '.', 'X', '.', '.'],
  };

  function clone(board) {
    return board.slice();
  }

  function winner(board) {
    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] !== '.' && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return board.includes('.') ? null : 'draw';
  }

  function legalMoves(board) {
    return board.map((cell, index) => (cell === '.' ? index : -1)).filter((index) => index >= 0);
  }

  function currentPlayer(board) {
    const x = board.filter((cell) => cell === 'X').length;
    const o = board.filter((cell) => cell === 'O').length;
    return x <= o ? 'X' : 'O';
  }

  function terminalScore(result, depth) {
    if (result === 'X') return 10 - depth;
    if (result === 'O') return depth - 10;
    return 0;
  }

  function minimax(board, player, alpha = -Infinity, beta = Infinity, depth = 0, stats = { nodes: 0, prunes: 0 }) {
    stats.nodes += 1;
    const result = winner(board);
    if (result) {
      return { score: terminalScore(result, depth), move: null, stats };
    }

    const maximizing = player === 'X';
    let bestScore = maximizing ? -Infinity : Infinity;
    let bestMove = null;

    for (const move of legalMoves(board)) {
      const next = clone(board);
      next[move] = player;
      const child = minimax(next, player === 'X' ? 'O' : 'X', alpha, beta, depth + 1, stats);
      const better = maximizing ? child.score > bestScore : child.score < bestScore;
      if (better || (child.score === bestScore && (bestMove === null || move < bestMove))) {
        bestScore = child.score;
        bestMove = move;
      }

      if (maximizing) {
        alpha = Math.max(alpha, bestScore);
      } else {
        beta = Math.min(beta, bestScore);
      }

      if (beta <= alpha) {
        stats.prunes += 1;
        break;
      }
    }

    return { score: bestScore, move: bestMove, stats };
  }

  function bestMove(board) {
    return minimax(board, currentPlayer(board));
  }

  function boardAfter(board, move) {
    const next = clone(board);
    next[move] = currentPlayer(board);
    return next;
  }

  function analyze(options = {}) {
    const board = (options.board || presets[options.preset || 'attack'] || presets.attack).slice();
    const player = currentPlayer(board);
    const result = minimax(board, player);
    const nextBoard = result.move === null ? board : boardAfter(board, result.move);
    return {
      board,
      nextBoard,
      player,
      move: result.move,
      score: result.score,
      metrics: {
        nodes: result.stats.nodes,
        prunes: result.stats.prunes,
        legalMoves: legalMoves(board).length,
        outcome: winner(nextBoard) || 'in-progress',
      },
    };
  }

  function benchmark(options = {}) {
    const runs = Math.max(1, Math.min(120, Math.floor(options.runs || 30)));
    const names = Object.keys(presets);
    const started = performance.now();
    let nodes = 0;
    let prunes = 0;
    for (let index = 0; index < runs; index += 1) {
      const result = analyze({ preset: names[index % names.length] });
      nodes += result.metrics.nodes;
      prunes += result.metrics.prunes;
    }
    return { runs, avgMs: (performance.now() - started) / runs, avgNodes: nodes / runs, avgPrunes: prunes / runs };
  }

  window.MinimaxCore = {
    analyze,
    benchmark,
    bestMove,
    boardAfter,
    clone,
    currentPlayer,
    legalMoves,
    minimax,
    presets,
    terminalScore,
    winner,
  };
}());
