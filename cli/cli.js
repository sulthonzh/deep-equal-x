#!/usr/bin/env node
'use strict';

import { deepEqual, deepEqualLoose, deepEqualPartial, diff } from '../src/index.js';

const args = process.argv.slice(2);
const command = args[0];

function usage() {
  console.log(`
deep-equal-x CLI

Usage:
  dequal <a> <b>              Deep compare two JSON values
  dequal --loose <a> <b>      Loose comparison (type coercion)
  dequal --partial <a> <b>    Partial comparison (subset check)
  dequal --diff <a> <b>       Show diff paths
  dequal demo                 Run demo

Options:
  --loose                     Enable loose mode
  --partial                   Enable partial mode
  --diff                      Show structural diff
  --filter <pattern>          Filter keys (regex pattern, negated with !)

Examples:
  dequal '{"a":1}' '{"a":1}'
  dequal --loose '{"a":1}' '{"a":"1"}'
  dequal --diff '{"a":1,"b":2}' '{"a":1,"b":3}'
  dequal --partial '{"a":1}' '{"a":1,"b":2}'
`);
}

function tryParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

function buildOptions(args) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--loose') opts.strict = false;
    if (args[i] === '--partial') opts.partial = true;
    if (args[i] === '--filter' && args[i + 1]) {
      const pattern = args[i + 1];
      if (pattern.startsWith('!')) {
        const re = new RegExp(pattern.slice(1));
        opts.filter = (k) => !re.test(k);
      } else {
        const re = new RegExp(pattern);
        opts.filter = (k) => re.test(k);
      }
    }
  }
  return opts;
}

function getPositional(args) {
  return args.filter((a) => !a.startsWith('--'));
}

if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(0);
}

if (command === 'demo') {
  console.log('═══ deep-equal-x Demo ═══\n');

  const pairs = [
    [{ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }, 'Matching objects'],
    [{ a: 1, b: [2, 4] }, { a: 1, b: [2, 3] }, 'Different array value'],
    [new Map([['x', 1]]), new Map([['x', 1]]), 'Matching Maps'],
    [{ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } }, 'Deeply nested match'],
    [{ a: 1, _ts: 123 }, { a: 1, _ts: 456 }, 'With key filter (ignore _ts)'],
  ];

  for (const [a, b, label] of pairs) {
    const opts = label.includes('filter') ? { filter: (k) => !k.startsWith('_') } : {};
    const result = deepEqual(a, b, opts);
    const icon = result ? '✓' : '✗';
    console.log(`${icon} ${label}`);
    console.log(`  a: ${JSON.stringify(a)}`);
    console.log(`  b: ${JSON.stringify(b)}`);
    console.log(`  equal: ${result}\n`);
  }

  console.log('═══ Diff Demo ═══\n');
  const d = diff(
    { name: 'Alice', age: 30, city: 'Jakarta' },
    { name: 'Alice', age: 25, country: 'ID' }
  );
  console.log('Differences between objects:');
  for (const { path, a, b } of d) {
    console.log(`  ${path}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
  }
  process.exit(0);
}

// Compare mode
const showDiff = args.includes('--diff');
const opts = buildOptions(args);
const positional = getPositional(args.filter((a) => !['--loose', '--partial', '--diff'].includes(a)));

if (positional.length < 2) {
  console.error('Error: need two values to compare\n');
  usage();
  process.exit(1);
}

const a = tryParse(positional[0]);
const b = tryParse(positional[1]);

if (showDiff) {
  const d = diff(a, b, opts);
  if (d.length === 0) {
    console.log('✓ Values are deeply equal');
    process.exit(0);
  }
  console.log(`Found ${d.length} difference(s):\n`);
  for (const { path: p, a: va, b: vb } of d) {
    console.log(`  ${p || '(root)'}: ${JSON.stringify(va)} → ${JSON.stringify(vb)}`);
  }
  process.exit(1);
}

const result = opts.partial
  ? deepEqualPartial(a, b, opts)
  : opts.strict === false
  ? deepEqualLoose(a, b, opts)
  : deepEqual(a, b, opts);

if (result) {
  console.log('✓ Deeply equal');
  process.exit(0);
} else {
  console.log('✗ Not equal');
  // Show first diff
  const d = diff(a, b, opts);
  if (d.length > 0) {
    const first = d[0];
    console.log(`  First difference at: ${first.path || '(root)'}`);
    console.log(`    a: ${JSON.stringify(first.a)}`);
    console.log(`    b: ${JSON.stringify(first.b)}`);
  }
  process.exit(1);
}
