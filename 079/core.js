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

  function generateFormula(options) {
    const seed = Math.floor(options.seed || 79);
    const vars = 18;
    const clauses = 74;
    const rng = createRng(seed);
    const assignment = Array.from({ length: vars + 1 }, (_, index) => index > 0 && ((index * 5 + seed) % 7 > 2));
    const formula = [];
    for (let i = 0; i < clauses; i += 1) {
      const clause = [];
      let satisfied = false;
      for (let k = 0; k < 3; k += 1) {
        const variable = 1 + Math.floor(rng() * vars);
        const positive = rng() > 0.5;
        satisfied = satisfied || assignment[variable] === positive;
        clause.push(positive ? variable : -variable);
      }
      if (!satisfied) clause[0] = assignment[Math.abs(clause[0])] ? Math.abs(clause[0]) : -Math.abs(clause[0]);
      formula.push(clause);
    }
    return { vars, formula, assignment };
  }

  function simplify(formula, literal) {
    return formula
      .filter((clause) => !clause.includes(literal))
      .map((clause) => clause.filter((item) => item !== -literal));
  }

  function dpll(formula, assignment) {
    if (formula.length === 0) return assignment;
    if (formula.some((clause) => clause.length === 0)) return null;
    const unit = formula.find((clause) => clause.length === 1);
    if (unit) return dpll(simplify(formula, unit[0]), { ...assignment, [Math.abs(unit[0])]: unit[0] > 0 });
    const literal = formula[0][0];
    return dpll(simplify(formula, literal), { ...assignment, [Math.abs(literal)]: literal > 0 })
      || dpll(simplify(formula, -literal), { ...assignment, [Math.abs(literal)]: literal < 0 });
  }

  function satisfies(formula, assignment) {
    return formula.every((clause) => clause.some((literal) => assignment[Math.abs(literal)] === (literal > 0)));
  }

  function analyze(options) {
    const problem = generateFormula(options || {});
    const solution = dpll(problem.formula, {});
    return {
      points: Array.from({ length: problem.vars }, (_, index) => ({ x: ((index % 6) + 1) / 7, y: (Math.floor(index / 6) + 1) / 4, r: solution[index + 1] ? 6 : 4 })),
      links: [],
      path: [],
      series: problem.formula.slice(0, 28).map((clause) => clause.length),
      metrics: {
        items: problem.formula.length,
        score: Object.keys(solution || {}).length,
        extra: problem.vars,
        verified: !!solution && satisfies(problem.formula, solution),
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

  window.ProjectCore = { analyze, benchmark, dpll, satisfies };
}());
