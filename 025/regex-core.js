(function attachRegexCore(global) {
  function tokenize(pattern) {
    return pattern.split('').filter((char) => char !== ' ');
  }

  function insertConcat(tokens) {
    const output = [];
    const left = (token) => token && token !== '(' && token !== '|';
    const right = (token) => token && token !== ')' && token !== '|' && token !== '*';
    tokens.forEach((token, index) => {
      const previous = tokens[index - 1];
      if (index > 0 && left(previous) && right(token)) output.push('.');
      output.push(token);
    });
    return output;
  }

  function toPostfix(pattern) {
    const precedence = { '|': 1, '.': 2, '*': 3 };
    const output = [];
    const stack = [];
    insertConcat(tokenize(pattern)).forEach((token) => {
      if (token === '(') stack.push(token);
      else if (token === ')') {
        while (stack.length && stack[stack.length - 1] !== '(') output.push(stack.pop());
        stack.pop();
      } else if (precedence[token]) {
        while (stack.length && precedence[stack[stack.length - 1]] >= precedence[token] && token !== '*') output.push(stack.pop());
        stack.push(token);
      } else output.push(token);
    });
    while (stack.length) output.push(stack.pop());
    return output;
  }

  function createState(states) {
    const state = { id: states.length, edges: [], accept: false };
    states.push(state);
    return state;
  }

  function compile(pattern) {
    const states = [];
    const stack = [];
    const postfix = toPostfix(pattern);
    const frag = (start, end) => ({ start, end });
    postfix.forEach((token) => {
      if (token === '.') {
        const b = stack.pop();
        const a = stack.pop();
        a.end.edges.push({ to: b.start.id, label: '' });
        stack.push(frag(a.start, b.end));
      } else if (token === '|') {
        const b = stack.pop();
        const a = stack.pop();
        const start = createState(states);
        const end = createState(states);
        start.edges.push({ to: a.start.id, label: '' }, { to: b.start.id, label: '' });
        a.end.edges.push({ to: end.id, label: '' });
        b.end.edges.push({ to: end.id, label: '' });
        stack.push(frag(start, end));
      } else if (token === '*') {
        const a = stack.pop();
        const start = createState(states);
        const end = createState(states);
        start.edges.push({ to: a.start.id, label: '' }, { to: end.id, label: '' });
        a.end.edges.push({ to: a.start.id, label: '' }, { to: end.id, label: '' });
        stack.push(frag(start, end));
      } else {
        const start = createState(states);
        const end = createState(states);
        start.edges.push({ to: end.id, label: token });
        stack.push(frag(start, end));
      }
    });
    if (stack.length !== 1) throw new Error(`Invalid pattern: ${pattern}`);
    const built = stack[0];
    built.end.accept = true;
    return { pattern, postfix, states, start: built.start.id, accept: built.end.id };
  }

  function epsilonClosure(nfa, ids) {
    const result = new Set(ids);
    const stack = [...ids];
    while (stack.length) {
      const state = nfa.states[stack.pop()];
      state.edges.forEach((edge) => {
        if (edge.label === '' && !result.has(edge.to)) {
          result.add(edge.to);
          stack.push(edge.to);
        }
      });
    }
    return result;
  }

  function step(nfa, active, char) {
    const next = new Set();
    active.forEach((id) => {
      nfa.states[id].edges.forEach((edge) => {
        if (edge.label === char || edge.label === '.') next.add(edge.to);
      });
    });
    return epsilonClosure(nfa, next);
  }

  function match(nfa, input) {
    let active = epsilonClosure(nfa, new Set([nfa.start]));
    const trace = [{ index: 0, char: '', active: [...active] }];
    for (let index = 0; index < input.length; index += 1) {
      active = step(nfa, active, input[index]);
      trace.push({ index: index + 1, char: input[index], active: [...active] });
    }
    return { matched: active.has(nfa.accept), trace, active: [...active] };
  }

  function analyze(options = {}) {
    const pattern = options.pattern || '(a|b)*abb';
    const input = options.input || 'aababb';
    const nfa = compile(pattern);
    const result = match(nfa, input);
    const edgeCount = nfa.states.reduce((sum, state) => sum + state.edges.length, 0);
    return {
      nfa,
      result,
      metrics: {
        states: nfa.states.length,
        edges: edgeCount,
        epsilonEdges: nfa.states.reduce((sum, state) => sum + state.edges.filter((edge) => edge.label === '').length, 0),
        inputLength: input.length,
        traceSteps: result.trace.length,
        matched: result.matched ? 1 : 0,
      },
    };
  }

  function benchmark(options = {}) {
    const iterations = Math.max(1, Math.round(options.iterations || 200));
    const started = Date.now();
    let result = null;
    for (let index = 0; index < iterations; index += 1) result = analyze(options);
    return { iterations, averageMs: (Date.now() - started) / iterations, lastMetrics: result.metrics };
  }

  const api = { analyze, benchmark, compile, epsilonClosure, match, step, toPostfix };
  global.RegexCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
