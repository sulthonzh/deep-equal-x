import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deepEqual,
  deepEqualLoose,
  deepEqualPartial,
  createDeepEqual,
  diff,
} from '../src/index.js';

// ─── Primitives ───
test('primitives: strict equality', () => {
  assert.equal(deepEqual(1, 1), true);
  assert.equal(deepEqual('a', 'a'), true);
  assert.equal(deepEqual(true, true), true);
  assert.equal(deepEqual(false, false), true);
  assert.equal(deepEqual(null, null), true);
  assert.equal(deepEqual(undefined, undefined), true);
  assert.equal(deepEqual(1, '1'), false);
  assert.equal(deepEqual(0, false), false);
  assert.equal(deepEqual(null, undefined), false);
});

test('NaN equals NaN', () => {
  assert.equal(deepEqual(NaN, NaN), true);
  assert.equal(deepEqual(NaN, 0), false);
});

// ─── Loose mode ───
test('loose mode allows type coercion', () => {
  assert.equal(deepEqualLoose(1, '1'), true);
  assert.equal(deepEqualLoose(0, false), false); // different typeof but both have same == ? actually 0 == false is true
  assert.equal(deepEqualLoose(null, undefined), true);
});

// ─── Objects ───
test('plain objects', () => {
  assert.equal(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
  assert.equal(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 }), false);
  assert.equal(deepEqual({}, {}), true);
});

test('nested objects', () => {
  const a = { x: { y: { z: 1 } } };
  const b = { x: { y: { z: 1 } } };
  assert.equal(deepEqual(a, b), true);
  assert.equal(deepEqual({ x: { y: 1 } }, { x: { y: 2 } }), false);
});

// ─── Arrays ───
test('arrays', () => {
  assert.equal(deepEqual([1, 2, 3], [1, 2, 3]), true);
  assert.equal(deepEqual([1, 2, 3], [1, 2, 4]), false);
  assert.equal(deepEqual([1, 2], [1, 2, 3]), false);
  assert.equal(deepEqual([], []), true);
  assert.equal(deepEqual([1, [2, 3]], [1, [2, 3]]), true);
  assert.equal(deepEqual([1, [2, 3]], [1, [2, 4]]), false);
});

test('array vs object', () => {
  assert.equal(deepEqual([1, 2], { 0: 1, 1: 2 }), false);
  assert.equal(deepEqual([], {}), false);
});

// ─── Dates ───
test('dates', () => {
  const d1 = new Date('2024-01-01');
  const d2 = new Date('2024-01-01');
  const d3 = new Date('2024-01-02');
  assert.equal(deepEqual(d1, d2), true);
  assert.equal(deepEqual(d1, d3), false);
});

// ─── RegExp ───
test('regexp', () => {
  assert.equal(deepEqual(/abc/g, /abc/g), true);
  assert.equal(deepEqual(/abc/, /abc/i), false);
  assert.equal(deepEqual(/abc/, /def/), false);
});

// ─── Map ───
test('maps with primitive keys', () => {
  const m1 = new Map([['a', 1], ['b', 2]]);
  const m2 = new Map([['a', 1], ['b', 2]]);
  const m3 = new Map([['a', 1], ['b', 3]]);
  assert.equal(deepEqual(m1, m2), true);
  assert.equal(deepEqual(m1, m3), false);
  assert.equal(deepEqual(new Map(), new Map()), true);
  assert.equal(deepEqual(new Map([['a', 1]]), new Map([['a', 1], ['b', 2]])), false);
});

test('maps with object keys', () => {
  const key = { id: 1 };
  const m1 = new Map([[key, 'val']]);
  const m2 = new Map([[{ id: 1 }, 'val']]);
  assert.equal(deepEqual(m1, m2), true);
});

test('maps with different sizes', () => {
  assert.equal(deepEqual(new Map([['a', 1]]), new Map([['a', 1], ['b', 2]])), false);
});

// ─── Set ───
test('sets with primitives', () => {
  assert.equal(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3])), true);
  assert.equal(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 4])), false);
  assert.equal(deepEqual(new Set([1, 2]), new Set([2, 1])), true);
  assert.equal(deepEqual(new Set(), new Set()), true);
});

test('sets with objects', () => {
  assert.equal(deepEqual(new Set([{ a: 1 }]), new Set([{ a: 1 }])), true);
  assert.equal(deepEqual(new Set([{ a: 1 }]), new Set([{ a: 2 }])), false);
});

// ─── Typed arrays ───
test('typed arrays', () => {
  assert.equal(deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])), true);
  assert.equal(deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])), false);
  assert.equal(deepEqual(new Int32Array([1, 2, 3]), new Int32Array([1, 2, 3])), true);
  assert.equal(deepEqual(new Float64Array([1.5, 2.5]), new Float64Array([1.5, 2.5])), true);
  assert.equal(deepEqual(new Uint8Array([1, 2, 3]), new Int8Array([1, 2, 3])), false);
});

// ─── ArrayBuffer ───
test('array buffers', () => {
  const buf1 = new Uint8Array([1, 2, 3]).buffer;
  const buf2 = new Uint8Array([1, 2, 3]).buffer;
  const buf3 = new Uint8Array([1, 2, 4]).buffer;
  assert.equal(deepEqual(buf1, buf2), true);
  assert.equal(deepEqual(buf1, buf3), false);
});

// ─── Circular references ───
test('circular references', () => {
  const a = { x: 1 };
  a.self = a;
  const b = { x: 1 };
  b.self = b;
  assert.equal(deepEqual(a, b), true);

  const c = { x: 2 };
  c.self = c;
  assert.equal(deepEqual(a, c), false);
});

test('cross-circular references', () => {
  const a = { name: 'a' };
  const b = { name: 'b' };
  a.ref = b;
  b.ref = a;

  const c = { name: 'a' };
  const d = { name: 'b' };
  c.ref = d;
  d.ref = c;

  assert.equal(deepEqual(a, c), true);
});

test('circular in arrays', () => {
  const a = [1, 2];
  a.push(a);
  const b = [1, 2];
  b.push(b);
  assert.equal(deepEqual(a, b), true);
});

// ─── Partial equality ───
test('partial equality', () => {
  assert.equal(deepEqualPartial({ a: 1 }, { a: 1, b: 2 }), true);
  assert.equal(deepEqualPartial({ a: 1, b: 2 }, { a: 1 }), false);
  assert.equal(deepEqualPartial({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 }, d: 3 }), true);
  assert.equal(deepEqualPartial({ a: 1 }, { a: 2 }), false);
  assert.equal(deepEqualPartial({}, { a: 1 }), true);
});

// ─── Key filter ───
test('key filter', () => {
  const opts = { filter: (k) => !k.startsWith('_') };
  assert.equal(deepEqual({ a: 1, _b: 2 }, { a: 1, _b: 3 }, opts), true);
  assert.equal(deepEqual({ a: 1, _b: 2 }, { a: 2, _b: 3 }, opts), false);
});

// ─── Depth limiting ───
test('depth limiting', () => {
  assert.equal(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } }, { depth: 0 }), false);
  // depth=0 just compares references at top level
});

// ─── Errors ───
test('errors', () => {
  assert.equal(deepEqual(new Error('msg'), new Error('msg')), true);
  assert.equal(deepEqual(new Error('msg'), new Error('other')), false);
  assert.equal(deepEqual(new TypeError('x'), new TypeError('x')), true);
  assert.equal(deepEqual(new Error('x'), new TypeError('x')), false);
});

// ─── URL ───
test('URL', () => {
  assert.equal(deepEqual(new URL('https://a.com'), new URL('https://a.com')), true);
  assert.equal(deepEqual(new URL('https://a.com'), new URL('https://b.com')), false);
});

// ─── createDeepEqual ───
test('createDeepEqual factory', () => {
  const looseEq = createDeepEqual({ strict: false });
  assert.equal(looseEq(1, '1'), true);
  assert.equal(looseEq(1, '1', { strict: true }), false);
});

// ─── diff ───
test('diff returns paths', () => {
  const d = diff({ a: 1, b: { c: 2, d: 3 } }, { a: 1, b: { c: 99, d: 3 } });
  assert.equal(d.length, 1);
  assert.equal(d[0].path, 'b.c');
  assert.equal(d[0].a, 2);
  assert.equal(d[0].b, 99);
});

test('diff arrays', () => {
  const d = diff([1, 2, 3], [1, 9, 3]);
  assert.equal(d.length, 1);
  assert.equal(d[0].path, '[1]');
});

test('diff missing keys', () => {
  const d = diff({ a: 1, b: 2 }, { a: 1 });
  assert.equal(d.length, 1);
  assert.equal(d[0].path, 'b');
});

test('diff identical returns empty', () => {
  assert.deepEqual(diff({ a: 1 }, { a: 1 }), []);
});

// ─── Edge cases ───
test('functions', () => {
  const f = () => {};
  assert.equal(deepEqual(f, f), true);
  assert.equal(deepEqual(() => {}, () => {}), false);
});

test('symbols as values', () => {
  const s = Symbol('x');
  assert.equal(deepEqual({ a: s }, { a: s }), true);
});

test('different types entirely', () => {
  assert.equal(deepEqual(1, []), false);
  assert.equal(deepEqual('str', {}), false);
  assert.equal(deepEqual(true, 1), false);
});

test('empty collections', () => {
  assert.equal(deepEqual({}, {}), true);
  assert.equal(deepEqual([], []), true);
  assert.equal(deepEqual(new Map(), new Map()), true);
  assert.equal(deepEqual(new Set(), new Set()), true);
});
