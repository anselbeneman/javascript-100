(function attachParserCore(global) {
  function tokenize(source) {
    const tokens = [];
    const re = /\s*([0-9]+(?:\.[0-9]+)?|[()+\-*/^])/y;
    let index = 0;
    while (index < source.length) {
      re.lastIndex = index;
      const match = re.exec(source);
      if (!match) throw new Error(`Unexpected token at ${index}`);
      const value = match[1];
      tokens.push({ type: /[0-9]/.test(value[0]) ? 'number' : value, value });
      index = re.lastIndex;
    }
    tokens.push({ type: 'eof', value: '' });
    return tokens;
  }

  const powers = { '+': 10, '-': 10, '*': 20, '/': 20, '^': 30 };

  function parse(source) {
    const tokens = tokenize(source);
    let cursor = 0;
    const peek = () => tokens[cursor];
    const next = () => tokens[cursor++];

    function expression(rbp = 0) {
      let token = next();
      let left;
      if (token.type === 'number') left = { type: 'number', value: Number(token.value) };
      else if (token.type === '-') left = { type: 'negate', value: expression(40) };
      else if (token.type === '(') {
        left = expression(0);
        if (next().type !== ')') throw new Error('Expected closing parenthesis');
      } else throw new Error(`Unexpected ${token.value}`);

      while (powers[peek().type] && rbp < powers[peek().type]) {
        token = next();
        const rightBinding = token.type === '^' ? powers[token.type] - 1 : powers[token.type];
        left = { type: 'binary', operator: token.type, left, right: expression(rightBinding) };
      }
      return left;
    }

    const ast = expression(0);
    if (peek().type !== 'eof') throw new Error('Unexpected trailing input');
    return { source, tokens, ast };
  }

  function evaluate(node) {
    if (node.type === 'number') return node.value;
    if (node.type === 'negate') return -evaluate(node.value);
    const a = evaluate(node.left);
    const b = evaluate(node.right);
    if (node.operator === '+') return a + b;
    if (node.operator === '-') return a - b;
    if (node.operator === '*') return a * b;
    if (node.operator === '/') return a / b;
    if (node.operator === '^') return Math.pow(a, b);
    throw new Error(`Unknown operator ${node.operator}`);
  }

  function countNodes(node) {
    if (!node) return 0;
    if (node.type === 'number') return 1;
    if (node.type === 'negate') return 1 + countNodes(node.value);
    return 1 + countNodes(node.left) + countNodes(node.right);
  }

  function depth(node) {
    if (!node) return 0;
    if (node.type === 'number') return 1;
    if (node.type === 'negate') return 1 + depth(node.value);
    return 1 + Math.max(depth(node.left), depth(node.right));
  }

  function analyze(options = {}) {
    const source = options.source || '3 + 4 * 2 / (1 - 5)^2^3';
    const parsed = parse(source);
    const value = evaluate(parsed.ast);
    return {
      ...parsed,
      value,
      metrics: {
        tokens: parsed.tokens.length - 1,
        nodes: countNodes(parsed.ast),
        depth: depth(parsed.ast),
        value,
      },
    };
  }

  function benchmark(options = {}) {
    const iterations = Math.max(1, Math.round(options.iterations || 1000));
    const started = Date.now();
    let result = null;
    for (let index = 0; index < iterations; index += 1) result = analyze(options);
    return { iterations, averageMs: (Date.now() - started) / iterations, lastMetrics: result.metrics };
  }

  const api = { analyze, benchmark, countNodes, depth, evaluate, parse, tokenize };
  global.ParserCore = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
