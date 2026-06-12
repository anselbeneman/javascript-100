const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = process.cwd();
const compilerCorePath = path.join(rootDir, '011', 'compiler-core.js');

function loadCompilerCore() {
  const context = vm.createContext({
    window: {},
    Math,
    Date,
  });

  vm.runInContext(fs.readFileSync(compilerCorePath, 'utf8'), context, {
    filename: path.relative(rootDir, compilerCorePath),
  });

  assert(context.window.CompilerCore, 'CompilerCore must be exposed on window');
  return context.window.CompilerCore;
}

const CompilerCore = loadCompilerCore();

function assertFiniteNumber(value, label) {
  assert.strictEqual(typeof value, 'number', `${label} must be numeric`);
  assert(Number.isFinite(value), `${label} must be finite`);
}

const source = [
  'let a = pi * 2 * t;',
  'let r = 0.72 * cos(a * 5);',
  'let x = cos(a) * r;',
  'let y = sin(a) * r;',
  'plot(x, y);',
].join('\n');

{
  const tokens = CompilerCore.tokenize(source);
  assert(tokens.length > 20, 'tokenizer should produce a useful token stream');
  assert.strictEqual(tokens[0].type, 'keyword');
  assert.strictEqual(tokens[0].value, 'let');
  assert.strictEqual(tokens[tokens.length - 1].type, 'eof');
}

{
  const ast = CompilerCore.parse(source);
  assert.strictEqual(ast.type, 'Program');
  assert.strictEqual(ast.body.length, 5);
  assert.strictEqual(ast.body[0].type, 'LetStatement');
  assert.strictEqual(ast.body[4].type, 'PlotStatement');
}

{
  const program = CompilerCore.compile(source);
  assert(program.bytecode.length > 12, 'compiler should emit bytecode');
  assert(program.bytecode.some((instruction) => instruction.op === 'CALL'), 'compiler should emit builtin calls');
  assert(program.bytecode.some((instruction) => instruction.op === 'PLOT'), 'compiler should emit plot opcode');
  assert(program.constants.includes(0.72), 'compiler should preserve numeric constants');
}

{
  const first = CompilerCore.runSource(source, { samples: 64, phase: 0.125 });
  const second = CompilerCore.runSource(source, { samples: 64, phase: 0.125 });

  assert.deepStrictEqual(first.result.plots, second.result.plots, 'VM execution should be deterministic');
  assert.strictEqual(first.result.metrics.samples, 64);
  assert.strictEqual(first.result.metrics.plotCount, 64);
  assert(first.result.metrics.steps > first.program.bytecode.length, 'sample execution should multiply VM steps');
  assert(first.result.metrics.maxStack >= 2, 'VM should report stack pressure');
  first.result.plots.slice(0, 6).forEach((plot) => {
    assertFiniteNumber(plot.x, 'plot x');
    assertFiniteNumber(plot.y, 'plot y');
  });
}

{
  const simple = CompilerCore.runSource('let x = 1 + 2 * 3; plot(x, -x);', { samples: 1 });
  assert.strictEqual(simple.result.plots.length, 1);
  assert.strictEqual(simple.result.plots[0].x, 7);
  assert.strictEqual(simple.result.plots[0].y, -7);
}

{
  assert.throws(
    () => CompilerCore.parse('let x = ;'),
    /Unexpected token|Expected/,
    'parser should report invalid syntax',
  );
}

['rose', 'lissajous', 'orbit', 'signal'].forEach((preset) => {
  const presetSource = CompilerCore.presetSource(preset);
  const output = CompilerCore.runSource(presetSource, { samples: 48 });
  assert.strictEqual(output.result.metrics.plotCount, 48, `${preset} preset should plot every sample`);
});

{
  const bench = CompilerCore.benchmark(source, { samples: 96, iterations: 8 });
  assert.strictEqual(bench.iterations, 8);
  assert.strictEqual(bench.samples, 96);
  assertFiniteNumber(bench.elapsedMs, 'benchmark elapsed');
  assert(bench.lastPlotCount > 0, 'benchmark should execute plots');
}

console.log('Project 011 unit tests passed');
