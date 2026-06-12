const assert = require('assert');
const path = require('path');

const Core = require(path.join('..', '007', 'automata-core.js'));

const lifeRule = Core.parseLifeRule('b633/s322');
assert.strictEqual(lifeRule.ruleText, 'B36/S23');
assert.deepStrictEqual(lifeRule.birth, [3, 6]);
assert.deepStrictEqual(lifeRule.survival, [2, 3]);

const width = 5;
const height = 5;
const cells = new Uint8Array(width * height);
cells[2 + width] = 1;
cells[2 + (2 * width)] = 1;
cells[2 + (3 * width)] = 1;
const rule = Core.createRule({ family: 'life', rule: 'B3/S23' });
const first = Core.step(cells, width, height, rule, false).cells;
assert.strictEqual(first[1 + (2 * width)], 1);
assert.strictEqual(first[2 + (2 * width)], 1);
assert.strictEqual(first[3 + (2 * width)], 1);
const second = Core.step(first, width, height, rule, false).cells;
assert.deepStrictEqual([...second], [...cells]);

const brian = Core.createRule({ family: 'brian', firingNeighbors: 2 });
const brainCells = new Uint8Array(9);
brainCells[0] = 1;
brainCells[2] = 1;
const brainNext = Core.step(brainCells, 3, 3, brian, false).cells;
assert.strictEqual(brainNext[4], 1);
assert.strictEqual(brainNext[0], 2);

const cyclic = Core.createRule({ family: 'cyclic', states: 4, threshold: 2 });
const cyclicCells = new Uint8Array(9);
cyclicCells[0] = 1;
cyclicCells[1] = 1;
const cyclicNext = Core.step(cyclicCells, 3, 3, cyclic, false).cells;
assert.strictEqual(cyclicNext[4], 1);
assert.deepStrictEqual([...Core.decodeRle(Core.encodeRle(cyclicNext), cyclicNext.length)], [...cyclicNext]);

const randomA = Core.randomGrid(10, 10, rule, 0.25, 'same');
const randomB = Core.randomGrid(10, 10, rule, 0.25, 'same');
assert.deepStrictEqual([...randomA], [...randomB]);

console.log('Project 007 unit tests passed');
