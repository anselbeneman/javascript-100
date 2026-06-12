(function attachExactCore(global) {
  const puzzles = {
    balanced: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    hard: '000000907000420180000705026100904000050000040000507009920108000034059000507000000',
    expert: '005300000800000020070010500400005300010070006003200080060500009004000030000009700',
  };

  function parsePuzzle(text) {
    return String(text).trim().split('').map((char) => (/[1-9]/.test(char) ? Number(char) : 0));
  }

  function boxIndex(row, col) {
    return Math.floor(row / 3) * 3 + Math.floor(col / 3);
  }

  function columnsFor(row, col, digit) {
    const d = digit - 1;
    return [
      row * 9 + col,
      81 + row * 9 + d,
      162 + col * 9 + d,
      243 + boxIndex(row, col) * 9 + d,
    ];
  }

  function buildRows(puzzle) {
    const rows = [];
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const fixed = puzzle[row * 9 + col];
        for (let digit = 1; digit <= 9; digit += 1) {
          if (fixed && fixed !== digit) continue;
          rows.push({ row, col, digit, columns: columnsFor(row, col, digit) });
        }
      }
    }
    return rows;
  }

  function solvePuzzle(input) {
    const puzzle = Array.isArray(input) ? input.slice() : parsePuzzle(puzzles[input] || input || puzzles.balanced);
    const candidateRows = buildRows(puzzle);
    const columns = Array.from({ length: 324 }, () => new Set());
    candidateRows.forEach((candidate, index) => {
      candidate.columns.forEach((column) => columns[column].add(index));
    });

    const activeColumns = new Set(Array.from({ length: 324 }, (_, index) => index));
    const activeRows = new Set(Array.from({ length: candidateRows.length }, (_, index) => index));
    const solution = [];
    const stats = { decisions: 0, backtracks: 0, maxDepth: 0, coveredColumns: 0 };

    function cover(rowIndex, log) {
      const row = candidateRows[rowIndex];
      solution.push(rowIndex);
      row.columns.forEach((column) => {
        if (!activeColumns.has(column)) return;
        activeColumns.delete(column);
        stats.coveredColumns += 1;
        columns[column].forEach((otherRow) => {
          if (activeRows.has(otherRow)) {
            activeRows.delete(otherRow);
            log.push(otherRow);
          }
        });
      });
    }

    function uncover(rowIndex, log) {
      for (let index = log.length - 1; index >= 0; index -= 1) activeRows.add(log[index]);
      candidateRows[rowIndex].columns.forEach((column) => activeColumns.add(column));
      solution.pop();
    }

    function chooseColumn() {
      let best = -1;
      let bestCount = Infinity;
      activeColumns.forEach((column) => {
        let count = 0;
        columns[column].forEach((rowIndex) => {
          if (activeRows.has(rowIndex)) count += 1;
        });
        if (count < bestCount) {
          bestCount = count;
          best = column;
        }
      });
      return { column: best, count: bestCount };
    }

    function search(depth) {
      stats.maxDepth = Math.max(stats.maxDepth, depth);
      if (activeColumns.size === 0) return true;
      const choice = chooseColumn();
      if (choice.count === 0) {
        stats.backtracks += 1;
        return false;
      }
      const options = [...columns[choice.column]].filter((rowIndex) => activeRows.has(rowIndex));
      for (let index = 0; index < options.length; index += 1) {
        stats.decisions += 1;
        const log = [];
        cover(options[index], log);
        if (search(depth + 1)) return true;
        uncover(options[index], log);
      }
      stats.backtracks += 1;
      return false;
    }

    const solved = search(0);
    const board = Array(81).fill(0);
    if (solved) {
      solution.forEach((rowIndex) => {
        const row = candidateRows[rowIndex];
        board[row.row * 9 + row.col] = row.digit;
      });
    }

    return {
      puzzle,
      board,
      solved,
      candidates: candidateRows.length,
      stats: {
        ...stats,
        givens: puzzle.filter(Boolean).length,
        solutionRows: solution.length,
        activeColumns: activeColumns.size,
      },
    };
  }

  function validateBoard(board) {
    const groups = [];
    for (let index = 0; index < 9; index += 1) {
      groups.push(board.slice(index * 9, index * 9 + 9));
      groups.push(Array.from({ length: 9 }, (_, row) => board[row * 9 + index]));
    }
    for (let box = 0; box < 9; box += 1) {
      const cells = [];
      const br = Math.floor(box / 3) * 3;
      const bc = (box % 3) * 3;
      for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) cells.push(board[(br + r) * 9 + bc + c]);
      groups.push(cells);
    }
    return groups.every((group) => group.slice().sort().join('') === '123456789');
  }

  function benchmarkSolve(options = {}) {
    const iterations = Math.max(1, Math.round(options.iterations || 12));
    const started = Date.now();
    let result = null;
    for (let index = 0; index < iterations; index += 1) result = solvePuzzle(options.preset || 'balanced');
    return { iterations, averageMs: (Date.now() - started) / iterations, lastStats: result ? result.stats : null };
  }

  const api = { benchmarkSolve, buildRows, columnsFor, parsePuzzle, puzzles, solvePuzzle, validateBoard };
  global.ExactCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
