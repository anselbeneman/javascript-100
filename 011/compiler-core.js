(function () {
  const KEYWORDS = new Set(['let', 'plot']);
  const BUILTINS = {
    abs: Math.abs,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    tanh: Math.tanh || ((value) => {
      const positive = Math.exp(value);
      const negative = Math.exp(-value);
      return (positive - negative) / (positive + negative);
    }),
    sqrt: Math.sqrt,
    pow: Math.pow,
    exp: Math.exp,
    min: Math.min,
    max: Math.max,
    clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    mix: (a, b, t) => a + (b - a) * t,
  };

  function isDigit(char) {
    return char >= '0' && char <= '9';
  }

  function isIdentifierStart(char) {
    return /[A-Za-z_]/.test(char);
  }

  function isIdentifierPart(char) {
    return /[A-Za-z0-9_]/.test(char);
  }

  function syntaxError(message, token) {
    const location = token ? ` at ${token.line}:${token.column}` : '';
    const error = new Error(`${message}${location}`);
    error.name = 'CompilerSyntaxError';
    return error;
  }

  function tokenize(source) {
    const tokens = [];
    let index = 0;
    let line = 1;
    let column = 1;

    function push(type, value, startLine, startColumn) {
      tokens.push({ type, value, line: startLine, column: startColumn });
    }

    while (index < source.length) {
      const char = source[index];
      const startLine = line;
      const startColumn = column;

      if (char === '\n') {
        index += 1;
        line += 1;
        column = 1;
        continue;
      }

      if (/\s/.test(char)) {
        index += 1;
        column += 1;
        continue;
      }

      if (char === '#') {
        while (index < source.length && source[index] !== '\n') {
          index += 1;
          column += 1;
        }
        continue;
      }

      if (isDigit(char) || (char === '.' && isDigit(source[index + 1] || ''))) {
        let raw = '';
        while (index < source.length && (isDigit(source[index]) || source[index] === '.')) {
          raw += source[index];
          index += 1;
          column += 1;
        }
        push('number', Number(raw), startLine, startColumn);
        continue;
      }

      if (isIdentifierStart(char)) {
        let raw = '';
        while (index < source.length && isIdentifierPart(source[index])) {
          raw += source[index];
          index += 1;
          column += 1;
        }
        push(KEYWORDS.has(raw) ? 'keyword' : 'identifier', raw, startLine, startColumn);
        continue;
      }

      if ('+-*/^=(),;'.includes(char)) {
        push('symbol', char, startLine, startColumn);
        index += 1;
        column += 1;
        continue;
      }

      throw syntaxError(`Unexpected character "${char}"`, { line, column });
    }

    tokens.push({ type: 'eof', value: '<eof>', line, column });
    return tokens;
  }

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.index = 0;
    }

    current() {
      return this.tokens[this.index];
    }

    consume() {
      const token = this.current();
      this.index += 1;
      return token;
    }

    match(value) {
      if (this.current().value === value) {
        this.consume();
        return true;
      }
      return false;
    }

    expect(value) {
      if (!this.match(value)) {
        throw syntaxError(`Expected "${value}", received "${this.current().value}"`, this.current());
      }
    }

    expectType(type) {
      const token = this.current();
      if (token.type !== type) {
        throw syntaxError(`Expected ${type}, received ${token.type}`, token);
      }
      return this.consume();
    }

    parseProgram() {
      const body = [];
      while (this.current().type !== 'eof') {
        body.push(this.parseStatement());
      }
      return { type: 'Program', body };
    }

    parseStatement() {
      const token = this.current();

      if (token.type === 'keyword' && token.value === 'let') {
        this.consume();
        const name = this.expectType('identifier').value;
        this.expect('=');
        const value = this.parseExpression(0);
        this.expect(';');
        return { type: 'LetStatement', name, value, line: token.line };
      }

      if (token.type === 'keyword' && token.value === 'plot') {
        this.consume();
        this.expect('(');
        const x = this.parseExpression(0);
        this.expect(',');
        const y = this.parseExpression(0);
        this.expect(')');
        this.expect(';');
        return { type: 'PlotStatement', x, y, line: token.line };
      }

      const expression = this.parseExpression(0);
      this.expect(';');
      return { type: 'ExpressionStatement', expression, line: token.line };
    }

    precedence(token) {
      if (token.value === '+' || token.value === '-') return 10;
      if (token.value === '*' || token.value === '/') return 20;
      if (token.value === '^') return 30;
      return 0;
    }

    parseExpression(minPrecedence) {
      let left = this.parsePrefix();

      while (this.current().type === 'symbol' && this.precedence(this.current()) >= minPrecedence && this.precedence(this.current()) > 0) {
        const operator = this.consume().value;
        const precedence = this.precedence({ value: operator });
        const rightAssociative = operator === '^';
        const right = this.parseExpression(precedence + (rightAssociative ? 0 : 1));
        left = {
          type: 'BinaryExpression',
          operator,
          left,
          right,
        };
      }

      return left;
    }

    parsePrefix() {
      const token = this.current();

      if (this.match('-')) {
        return {
          type: 'UnaryExpression',
          operator: '-',
          argument: this.parseExpression(40),
        };
      }

      if (token.type === 'number') {
        this.consume();
        return { type: 'NumberLiteral', value: token.value };
      }

      if (token.type === 'identifier') {
        this.consume();
        if (this.match('(')) {
          const args = [];
          if (!this.match(')')) {
            do {
              args.push(this.parseExpression(0));
            } while (this.match(','));
            this.expect(')');
          }
          return { type: 'CallExpression', name: token.value, args };
        }
        return { type: 'Identifier', name: token.value };
      }

      if (this.match('(')) {
        const expression = this.parseExpression(0);
        this.expect(')');
        return expression;
      }

      throw syntaxError(`Unexpected token "${token.value}"`, token);
    }
  }

  function parse(source) {
    return new Parser(tokenize(source)).parseProgram();
  }

  function createConstantPool() {
    const constants = [];
    const indexes = new Map();

    return {
      constants,
      add(value) {
        const key = String(value);
        if (!indexes.has(key)) {
          indexes.set(key, constants.length);
          constants.push(value);
        }
        return indexes.get(key);
      },
    };
  }

  function compile(source) {
    const ast = typeof source === 'string' ? parse(source) : source;
    const pool = createConstantPool();
    const bytecode = [];
    const identifiers = new Set();

    function emit(op, arg, meta = {}) {
      bytecode.push({ op, arg, ...meta });
    }

    function compileExpression(node) {
      if (node.type === 'NumberLiteral') {
        emit('CONST', pool.add(node.value));
        return;
      }

      if (node.type === 'Identifier') {
        identifiers.add(node.name);
        emit('LOAD', node.name);
        return;
      }

      if (node.type === 'UnaryExpression') {
        compileExpression(node.argument);
        emit('NEG');
        return;
      }

      if (node.type === 'BinaryExpression') {
        compileExpression(node.left);
        compileExpression(node.right);
        const ops = {
          '+': 'ADD',
          '-': 'SUB',
          '*': 'MUL',
          '/': 'DIV',
          '^': 'POW',
        };
        emit(ops[node.operator]);
        return;
      }

      if (node.type === 'CallExpression') {
        node.args.forEach(compileExpression);
        emit('CALL', { name: node.name, argc: node.args.length });
        return;
      }

      throw new Error(`Unsupported expression node: ${node.type}`);
    }

    ast.body.forEach((statement) => {
      if (statement.type === 'LetStatement') {
        compileExpression(statement.value);
        identifiers.add(statement.name);
        emit('STORE', statement.name, { line: statement.line });
        return;
      }

      if (statement.type === 'PlotStatement') {
        compileExpression(statement.x);
        compileExpression(statement.y);
        emit('PLOT', null, { line: statement.line });
        return;
      }

      if (statement.type === 'ExpressionStatement') {
        compileExpression(statement.expression);
        emit('POP', null, { line: statement.line });
        return;
      }

      throw new Error(`Unsupported statement node: ${statement.type}`);
    });

    return {
      ast,
      bytecode,
      constants: pool.constants,
      identifiers: [...identifiers].sort(),
    };
  }

  function executeBytecode(program, options = {}) {
    const samples = Math.max(1, Math.floor(options.samples || 1));
    const phase = Number(options.phase || 0);
    const plots = [];
    const trace = [];
    let steps = 0;
    let maxStack = 0;
    let lastEnv = {};

    for (let sample = 0; sample < samples; sample += 1) {
      const t = samples <= 1 ? phase : (sample / (samples - 1) + phase) % 1;
      const env = {
        pi: Math.PI,
        e: Math.E,
        i: sample,
        t,
      };
      const stack = [];

      for (let pc = 0; pc < program.bytecode.length; pc += 1) {
        const instruction = program.bytecode[pc];
        steps += 1;

        if (instruction.op === 'CONST') {
          stack.push(program.constants[instruction.arg]);
        } else if (instruction.op === 'LOAD') {
          stack.push(Number(env[instruction.arg] || 0));
        } else if (instruction.op === 'STORE') {
          env[instruction.arg] = stack.pop();
        } else if (instruction.op === 'ADD') {
          stack.push(stack.pop() + stack.pop());
        } else if (instruction.op === 'SUB') {
          const right = stack.pop();
          const left = stack.pop();
          stack.push(left - right);
        } else if (instruction.op === 'MUL') {
          stack.push(stack.pop() * stack.pop());
        } else if (instruction.op === 'DIV') {
          const right = stack.pop();
          const left = stack.pop();
          stack.push(left / (Math.abs(right) < 1e-9 ? 1e-9 : right));
        } else if (instruction.op === 'POW') {
          const right = stack.pop();
          const left = stack.pop();
          stack.push(Math.pow(left, right));
        } else if (instruction.op === 'NEG') {
          stack.push(-stack.pop());
        } else if (instruction.op === 'CALL') {
          const args = [];
          for (let index = 0; index < instruction.arg.argc; index += 1) {
            args.unshift(stack.pop());
          }
          const fn = BUILTINS[instruction.arg.name];
          if (!fn) {
            throw new Error(`Unknown function: ${instruction.arg.name}`);
          }
          stack.push(fn(...args));
        } else if (instruction.op === 'PLOT') {
          const y = stack.pop();
          const x = stack.pop();
          plots.push({ x, y, t, sample });
        } else if (instruction.op === 'POP') {
          stack.pop();
        } else {
          throw new Error(`Unknown opcode: ${instruction.op}`);
        }

        maxStack = Math.max(maxStack, stack.length);
        if (sample === 0 && trace.length < 64) {
          trace.push({
            pc,
            op: instruction.op,
            stackDepth: stack.length,
          });
        }
      }

      lastEnv = env;
    }

    return {
      plots,
      trace,
      env: lastEnv,
      metrics: {
        samples,
        steps,
        maxStack,
        plotCount: plots.length,
        variables: Object.keys(lastEnv).length,
        bytecodeLength: program.bytecode.length,
      },
    };
  }

  function runSource(source, options = {}) {
    const tokens = tokenize(source);
    const program = compile(new Parser(tokens).parseProgram());
    const result = executeBytecode(program, options);
    return {
      tokens,
      program,
      result,
    };
  }

  function benchmark(source, options = {}) {
    const samples = Math.max(16, Math.floor(options.samples || 240));
    const iterations = Math.max(1, Math.floor(options.iterations || 80));
    const program = compile(source);
    const now = typeof performance !== 'undefined' && performance.now
      ? () => performance.now()
      : () => Date.now();
    const started = now();
    let result = null;

    for (let index = 0; index < iterations; index += 1) {
      result = executeBytecode(program, {
        samples,
        phase: index / iterations,
      });
    }

    return {
      iterations,
      samples,
      elapsedMs: now() - started,
      lastPlotCount: result ? result.metrics.plotCount : 0,
      bytecodeLength: program.bytecode.length,
    };
  }

  function presetSource(name) {
    if (name === 'lissajous') {
      return [
        '# Lissajous curve',
        'let a = pi * 2 * t;',
        'let x = sin(a * 3);',
        'let y = cos(a * 4);',
        'plot(x, y);',
      ].join('\n');
    }

    if (name === 'orbit') {
      return [
        '# Nested orbital flower',
        'let a = pi * 2 * t;',
        'let r = 0.45 + 0.28 * sin(a * 6);',
        'let wobble = 0.12 * sin(a * 17);',
        'plot(cos(a) * (r + wobble), sin(a) * (r - wobble));',
      ].join('\n');
    }

    if (name === 'signal') {
      return [
        '# Signal modulation',
        'let a = pi * 2 * t;',
        'let carrier = sin(a * 5);',
        'let envelope = 0.35 + 0.5 * sin(a * 2) * sin(a * 2);',
        'plot(t * 2 - 1, carrier * envelope);',
      ].join('\n');
    }

    return [
      '# Parametric rose',
      'let a = pi * 2 * t;',
      'let r = 0.72 * cos(a * 5);',
      'let x = cos(a) * r;',
      'let y = sin(a) * r;',
      'plot(x, y);',
    ].join('\n');
  }

  window.CompilerCore = {
    benchmark,
    compile,
    executeBytecode,
    parse,
    presetSource,
    runSource,
    tokenize,
  };
}());
