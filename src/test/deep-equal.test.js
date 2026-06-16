import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deepEqual, shallowEqual, deepClone, diff, createDeepEqualSelector } from '../index.js';

// ─── deepEqual: Primitives ──────────────────────────────────────────────

describe('deepEqual — primitives', () => {
  it('equal numbers', () => {
    assert.equal(deepEqual(1, 1), true);
    assert.equal(deepEqual(0, 0), true);
    assert.equal(deepEqual(-1, -1), true);
    assert.equal(deepEqual(Infinity, Infinity), true);
    assert.equal(deepEqual(NaN, NaN), true);
  });

  it('unequal numbers', () => {
    assert.equal(deepEqual(1, 2), false);
    assert.equal(deepEqual(0, -0), false);
    assert.equal(deepEqual(Infinity, -Infinity), false);
  });

  it('strings', () => {
    assert.equal(deepEqual('', ''), true);
    assert.equal(deepEqual('hello', 'hello'), true);
    assert.equal(deepEqual('hello', 'world'), false);
  });

  it('booleans', () => {
    assert.equal(deepEqual(true, true), true);
    assert.equal(deepEqual(false, false), true);
    assert.equal(deepEqual(true, false), false);
  });

  it('null and undefined', () => {
    assert.equal(deepEqual(null, null), true);
    assert.equal(deepEqual(undefined, undefined), true);
    assert.equal(deepEqual(null, undefined), false);
  });

  it('bigint', () => {
    assert.equal(deepEqual(0n, 0n), true);
    assert.equal(deepEqual(1n, 1n), true);
    assert.equal(deepEqual(1n, 2n), false);
  });

  it('different types', () => {
    assert.equal(deepEqual(1, '1'), false);
    assert.equal(deepEqual(0, false), false);
    assert.equal(deepEqual(null, 0), false);
  });

  it('symbols', () => {
    const s1 = Symbol('x');
    const s2 = Symbol('x');
    assert.equal(deepEqual(s1, s1), true);
    assert.equal(deepEqual(s1, s2), false);
  });
});

// ─── deepEqual: Arrays ──────────────────────────────────────────────────

describe('deepEqual — arrays', () => {
  it('simple arrays', () => {
    assert.equal(deepEqual([1, 2, 3], [1, 2, 3]), true);
    assert.equal(deepEqual([1, 2, 3], [1, 2, 4]), false);
    assert.equal(deepEqual([1, 2], [1, 2, 3]), false);
    assert.equal(deepEqual([], []), true);
  });

  it('nested arrays', () => {
    assert.equal(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 4]]), true);
    assert.equal(deepEqual([[1, 2], [3, 4]], [[1, 2], [3, 5]]), false);
  });

  it('mixed content', () => {
    assert.equal(deepEqual([1, 'a', true, null], [1, 'a', true, null]), true);
    assert.equal(deepEqual([{ a: 1 }], [{ a: 1 }]), true);
  });

  it('sparse arrays', () => {
    // eslint-disable-next-line no-sparse-arrays
    const sparse = [1, , 3];
    assert.equal(deepEqual(sparse, [1, undefined, 3]), false);
  });
});

// ─── deepEqual: Objects ─────────────────────────────────────────────────

describe('deepEqual — objects', () => {
  it('simple objects', () => {
    assert.equal(deepEqual({ a: 1 }, { a: 1 }), true);
    assert.equal(deepEqual({ a: 1 }, { a: 2 }), false);
    assert.equal(deepEqual({ a: 1 }, { b: 1 }), false);
  });

  it('nested objects', () => {
    assert.equal(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } }), true);
    assert.equal(deepEqual({ a: { b: 1 } }, { a: { b: 2 } }), false);
  });

  it('key order irrelevant', () => {
    assert.equal(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
  });

  it('extra keys', () => {
    assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
  });

  it('empty objects', () => {
    assert.equal(deepEqual({}, {}), true);
  });

  it('prototype chain matters', () => {
    class A { constructor(public x: number) {} }
    class B { constructor(public x: number) {} }
    assert.equal(deepEqual(new A(1), new B(1)), false);
    assert.equal(deepEqual(new A(1), new A(1)), true);
  });
});

// ─── deepEqual: Built-in Types ──────────────────────────────────────────

describe('deepEqual — built-in types', () => {
  it('Date', () => {
    const d1 = new Date('2024-01-01');
    const d2 = new Date('2024-01-01');
    const d3 = new Date('2024-06-01');
    assert.equal(deepEqual(d1, d2), true);
    assert.equal(deepEqual(d1, d3), false);
  });

  it('RegExp', () => {
    assert.equal(deepEqual(/foo/gi, /foo/gi), true);
    assert.equal(deepEqual(/foo/gi, /foo/i), false);
    assert.equal(deepEqual(/foo/g, /bar/g), false);
  });

  it('Error', () => {
    assert.equal(deepEqual(new Error('msg'), new Error('msg')), true);
    assert.equal(deepEqual(new Error('msg'), new Error('other')), false);
    assert.equal(deepEqual(new TypeError('x'), new RangeError('x')), false);
  });

  it('URL', () => {
    assert.equal(deepEqual(new URL('https://a.com'), new URL('https://a.com')), true);
    assert.equal(deepEqual(new URL('https://a.com'), new URL('https://b.com')), false);
  });

  it('Map', () => {
    const m1 = new Map([['a', 1], ['b', 2]]);
    const m2 = new Map([['a', 1], ['b', 2]]);
    const m3 = new Map([['a', 1], ['b', 3]]);
    assert.equal(deepEqual(m1, m2), true);
    assert.equal(deepEqual(m1, m3), false);
    assert.equal(deepEqual(new Map([['a', 1]]), new Map([['a', 1], ['b', 2]])), false);
  });

  it('Set', () => {
    const s1 = new Set([1, 2, 3]);
    const s2 = new Set([1, 2, 3]);
    const s3 = new Set([1, 2, 4]);
    assert.equal(deepEqual(s1, s2), true);
    assert.equal(deepEqual(s1, s3), false);
    assert.equal(deepEqual(new Set([1]), new Set([1, 2])), false);
  });

  it('ArrayBuffer', () => {
    const buf1 = new Uint8Array([1, 2, 3]).buffer;
    const buf2 = new Uint8Array([1, 2, 3]).buffer;
    const buf3 = new Uint8Array([1, 2, 4]).buffer;
    assert.equal(deepEqual(buf1, buf2), true);
    assert.equal(deepEqual(buf1, buf3), false);
  });

  it('TypedArrays', () => {
    assert.equal(deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])), true);
    assert.equal(deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])), false);
    assert.equal(deepEqual(new Int32Array([1, 2]), new Int32Array([1, 2])), true);
    assert.equal(deepEqual(new Float64Array([1.5]), new Float64Array([1.5])), true);
    assert.equal(deepEqual(new Uint8Array([1]), new Int8Array([1])), false);
  });

  it('DataView', () => {
    const dv1 = new DataView(new ArrayBuffer(4));
    dv1.setUint8(0, 255);
    const dv2 = new DataView(new ArrayBuffer(4));
    dv2.setUint8(0, 255);
    assert.equal(deepEqual(dv1, dv2), true);
  });
});

// ─── deepEqual: Circular References ─────────────────────────────────────

describe('deepEqual — circular references', () => {
  it('self-referencing objects', () => {
    const a = { x: 1 };
    a.self = a;
    const b = { x: 1 };
    b.self = b;
    assert.equal(deepEqual(a, b), true);
  });

  it('cross-referencing', () => {
    const shared = { val: 42 };
    const a = { left: shared, right: shared };
    const b = { left: shared, right: shared };
    assert.equal(deepEqual(a, b), true);
  });

  it('different circular structure', () => {
    const a = { x: 1 };
    a.self = a;
    const b = { x: 1 };
    b.self = { x: 2 };
    assert.equal(deepEqual(a, b), false);
  });
});

// ─── shallowEqual ───────────────────────────────────────────────────────

describe('shallowEqual', () => {
  it('primitives', () => {
    assert.equal(shallowEqual(1, 1), true);
    assert.equal(shallowEqual('a', 'a'), true);
    assert.equal(shallowEqual(1, 2), false);
  });

  it('arrays — same refs', () => {
    const inner = [1];
    assert.equal(shallowEqual({ a: inner }, { a: inner }), true);
  });

  it('arrays — different refs same values', () => {
    assert.equal(shallowEqual({ a: [1] }, { a: [1] }), false);
  });

  it('objects — same values', () => {
    assert.equal(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
    assert.equal(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 3 }), false);
  });

  it('objects — extra key', () => {
    assert.equal(shallowEqual({ a: 1 }, { a: 1, b: 2 }), false);
  });

  it('null safety', () => {
    assert.equal(shallowEqual(null, null), true);
    assert.equal(shallowEqual(null, {}), false);
    assert.equal(shallowEqual({}, null), false);
  });
});

// ─── deepClone ──────────────────────────────────────────────────────────

describe('deepClone', () => {
  it('primitives', () => {
    assert.equal(deepClone(42), 42);
    assert.equal(deepClone('hello'), 'hello');
    assert.equal(deepClone(null), null);
    assert.equal(deepClone(undefined), undefined);
    assert.equal(deepClone(true), true);
  });

  it('arrays', () => {
    const original = [1, [2, [3, [4]]]];
    const cloned = deepClone(original);
    assert.deepEqual(cloned, original);
    assert.notEqual(cloned, original);
    assert.notEqual(cloned[1], original[1]);
  });

  it('objects', () => {
    const original = { a: { b: { c: 1 } }, d: [1, 2] };
    const cloned = deepClone(original);
    assert.deepEqual(cloned, original);
    cloned.a.b.c = 99;
    assert.equal(original.a.b.c, 1);
  });

  it('Date', () => {
    const original = new Date('2024-06-16');
    const cloned = deepClone(original);
    assert.equal(cloned.getTime(), original.getTime());
    assert.notEqual(cloned, original);
  });

  it('RegExp', () => {
    const original = /pattern/gi;
    const cloned = deepClone(original);
    assert.equal(cloned.source, original.source);
    assert.equal(cloned.flags, original.flags);
  });

  it('Map', () => {
    const original = new Map([['key', { val: 1 }]]);
    const cloned = deepClone(original);
    assert.equal(cloned.get('key').val, 1);
    cloned.get('key').val = 99;
    assert.equal(original.get('key').val, 1);
  });

  it('Set', () => {
    const obj = { x: 1 };
    const original = new Set([obj]);
    const cloned = deepClone(original);
    assert.equal(cloned.size, 1);
    const clonedVal = cloned.values().next().value;
    assert.deepEqual(clonedVal, { x: 1 });
    assert.notEqual(clonedVal, obj);
  });

  it('TypedArrays', () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const cloned = deepClone(original);
    assert.deepEqual(Array.from(cloned), [1, 2, 3, 4]);
    cloned[0] = 255;
    assert.equal(original[0], 1);
  });

  it('Error with cause', () => {
    const original = new Error('outer');
    original.cause = new Error('inner');
    const cloned = deepClone(original);
    assert.ok(cloned instanceof Error);
    assert.equal(cloned.message, 'outer');
    const clonedCause = cloned.cause;
    assert.ok(clonedCause);
    assert.equal(clonedCause.message, 'inner');
  });

  it('circular references', () => {
    const original = { a: 1 };
    original.self = original;
    const cloned = deepClone(original);
    assert.equal(cloned.a, 1);
    assert.equal(cloned.self, cloned);
    assert.notEqual(cloned, original);
  });

  it('preserves prototype chain', () => {
    class Person {
      constructor(public name: string) {}
      greet() { return `hi ${this.name}`; }
    }
    const original = new Person('ada');
    const cloned = deepClone(original);
    assert.ok(cloned instanceof Person);
    assert.equal(cloned.name, 'ada');
    assert.equal(cloned.greet(), 'hi ada');
    assert.equal(Object.getPrototypeOf(cloned), Person.prototype);
  });

  it('preserves property descriptors', () => {
    const original = {};
    Object.defineProperty(original, 'hidden', { value: 42, enumerable: false, writable: true, configurable: true });
    const cloned = deepClone(original);
    const desc = Object.getOwnPropertyDescriptor(cloned, 'hidden');
    assert.ok(desc);
    assert.equal(desc!.value, 42);
    assert.equal(desc!.enumerable, false);
  });

  it('handles symbol keys', () => {
    const sym = Symbol('test');
    const original = { [sym]: 'value' };
    const cloned = deepClone(original);
    assert.equal(cloned[sym], 'value');
  });
});

// ─── diff ───────────────────────────────────────────────────────────────

describe('diff', () => {
  it('equal values — no diff', () => {
    assert.deepEqual(diff({ a: 1 }, { a: 1 }), []);
  });

  it('simple key change', () => {
    assert.deepEqual(diff({ a: 1, b: 2 }, { a: 1, b: 3 }), ['b']);
  });

  it('nested change', () => {
    assert.deepEqual(diff({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } }), ['a.b.c']);
  });

  it('added key', () => {
    assert.deepEqual(diff({ a: 1 }, { a: 1, b: 2 }), ['b']);
  });

  it('removed key', () => {
    assert.deepEqual(diff({ a: 1, b: 2 }, { a: 1 }), ['b']);
  });

  it('array changes', () => {
    const result = diff([1, 2, 3], [1, 2, 4]);
    assert.deepEqual(result, ['[2]']);
  });

  it('completely different primitives', () => {
    assert.deepEqual(diff(1, 2), []);
  });
});

// ─── createDeepEqualSelector ────────────────────────────────────────────

describe('createDeepEqualSelector', () => {
  it('initial state — no value', () => {
    const sel = createDeepEqualSelector();
    assert.equal(sel.equals({ a: 1 }), false);
    assert.equal(sel.get(), undefined);
  });

  it('stores and compares', () => {
    const sel = createDeepEqualSelector();
    sel.set({ a: 1, b: [1, 2] });
    assert.equal(sel.equals({ a: 1, b: [1, 2] }), true);
    assert.equal(sel.equals({ a: 1, b: [1, 3] }), false);
  });

  it('get returns stored value', () => {
    const sel = createDeepEqualSelector();
    const val = { x: 42 };
    sel.set(val);
    assert.equal(sel.get(), val);
  });

  it('overwrite on re-set', () => {
    const sel = createDeepEqualSelector();
    sel.set({ a: 1 });
    sel.set({ b: 2 });
    assert.equal(sel.equals({ a: 1 }), false);
    assert.equal(sel.equals({ b: 2 }), true);
  });
});
