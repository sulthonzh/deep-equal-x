import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deepEqual, shallowEqual, deepClone, diff, createDeepEqualSelector } from '../index.js';
describe('deepEqual', () => {
    describe('primitives', () => {
        it('equal primitives', () => {
            assert.equal(deepEqual(1, 1), true);
            assert.equal(deepEqual('hello', 'hello'), true);
            assert.equal(deepEqual(true, true), true);
            assert.equal(deepEqual(false, false), true);
            assert.equal(deepEqual(null, null), true);
            assert.equal(deepEqual(undefined, undefined), true);
            assert.equal(deepEqual(0n, 0n), true);
            assert.equal(deepEqual(Symbol('a'), Symbol('a')), false); // different symbol refs
        });
        it('unequal primitives', () => {
            assert.equal(deepEqual(1, 2), false);
            assert.equal(deepEqual('a', 'b'), false);
            assert.equal(deepEqual(true, false), false);
            assert.equal(deepEqual(0, null), false);
            assert.equal(deepEqual(undefined, null), false);
            assert.equal(deepEqual(NaN, NaN), true); // Object.is handles NaN
        });
        it('different types', () => {
            assert.equal(deepEqual(1, '1'), false);
            assert.equal(deepEqual(0, false), false);
            assert.equal(deepEqual([], ''), false);
        });
    });
    describe('arrays', () => {
        it('simple arrays', () => {
            assert.equal(deepEqual([1, 2, 3], [1, 2, 3]), true);
            assert.equal(deepEqual([1, 2, 3], [1, 2, 4]), false);
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
        it('different lengths', () => {
            assert.equal(deepEqual([1, 2], [1, 2, 3]), false);
            assert.equal(deepEqual([1, 2, 3], [1, 2]), false);
        });
    });
    describe('objects', () => {
        it('simple objects', () => {
            assert.equal(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
            assert.equal(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 }), false);
        });
        it('nested objects', () => {
            assert.equal(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } }), true);
            assert.equal(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } }), false);
        });
        it('different key counts', () => {
            assert.equal(deepEqual({ a: 1 }, { a: 1, b: 2 }), false);
        });
        it('key order irrelevant', () => {
            assert.equal(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 }), true);
        });
    });
    describe('Date', () => {
        it('equal dates', () => {
            assert.equal(deepEqual(new Date('2024-01-01'), new Date('2024-01-01')), true);
        });
        it('unequal dates', () => {
            assert.equal(deepEqual(new Date('2024-01-01'), new Date('2024-01-02')), false);
        });
        it('invalid dates', () => {
            assert.equal(deepEqual(new Date('invalid'), new Date('invalid')), true);
        });
    });
    describe('RegExp', () => {
        it('equal regex', () => {
            assert.equal(deepEqual(/abc/g, /abc/g), true);
        });
        it('different flags', () => {
            assert.equal(deepEqual(/abc/g, /abc/i), false);
        });
        it('different source', () => {
            assert.equal(deepEqual(/abc/, /def/), false);
        });
    });
    describe('Map', () => {
        it('equal maps', () => {
            assert.equal(deepEqual(new Map([['a', 1], ['b', 2]]), new Map([['a', 1], ['b', 2]])), true);
        });
        it('unequal values', () => {
            assert.equal(deepEqual(new Map([['a', 1]]), new Map([['a', 2]])), false);
        });
        it('different sizes', () => {
            assert.equal(deepEqual(new Map([['a', 1]]), new Map([['a', 1], ['b', 2]])), false);
        });
        it('nested maps', () => {
            const m1 = new Map([['x', new Map([['y', 1]])]]);
            const m2 = new Map([['x', new Map([['y', 1]])]]);
            assert.equal(deepEqual(m1, m2), true);
        });
    });
    describe('Set', () => {
        it('equal sets', () => {
            assert.equal(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3])), true);
        });
        it('different sizes', () => {
            assert.equal(deepEqual(new Set([1, 2, 3]), new Set([1, 2])), false);
        });
        it('different content', () => {
            assert.equal(deepEqual(new Set([1, 2, 3]), new Set([1, 2, 4])), false);
        });
    });
    describe('circular references', () => {
        it('self-referencing objects', () => {
            const a = { x: 1 };
            a.self = a;
            const b = { x: 1 };
            b.self = b;
            assert.equal(deepEqual(a, b), true);
        });
        it('different circular structure', () => {
            const a = { x: 1 };
            a.self = a;
            const b = { x: 2 };
            b.self = b;
            assert.equal(deepEqual(a, b), false);
        });
        it('mutual circular refs', () => {
            const a = { val: 1 };
            const b = { val: 1 };
            a.ref = b;
            b.ref = a;
            const c = { val: 1 };
            const d = { val: 1 };
            c.ref = d;
            d.ref = c;
            assert.equal(deepEqual(a, c), true);
        });
    });
    describe('TypedArrays', () => {
        it('Uint8Array', () => {
            assert.equal(deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3])), true);
            assert.equal(deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4])), false);
        });
        it('Int32Array', () => {
            assert.equal(deepEqual(new Int32Array([1, 2, 3]), new Int32Array([1, 2, 3])), true);
            assert.equal(deepEqual(new Int32Array([1, 2, 3]), new Int32Array([1, 2])), false);
        });
        it('Float64Array', () => {
            assert.equal(deepEqual(new Float64Array([1.5, 2.5]), new Float64Array([1.5, 2.5])), true);
            assert.equal(deepEqual(new Float64Array([1.5, 2.5]), new Float64Array([1.5, 3.0])), false);
        });
        it('different typed array types', () => {
            assert.equal(deepEqual(new Uint8Array([1, 2]), new Int8Array([1, 2])), false);
        });
    });
    describe('ArrayBuffer', () => {
        it('equal buffers', () => {
            const buf1 = new ArrayBuffer(4);
            const buf2 = new ArrayBuffer(4);
            new Uint8Array(buf1).set([1, 2, 3, 4]);
            new Uint8Array(buf2).set([1, 2, 3, 4]);
            assert.equal(deepEqual(buf1, buf2), true);
        });
        it('unequal buffers', () => {
            const buf1 = new ArrayBuffer(4);
            const buf2 = new ArrayBuffer(4);
            new Uint8Array(buf1).set([1, 2, 3, 4]);
            new Uint8Array(buf2).set([1, 2, 3, 5]);
            assert.equal(deepEqual(buf1, buf2), false);
        });
    });
    describe('Error', () => {
        it('equal errors', () => {
            assert.equal(deepEqual(new Error('test'), new Error('test')), true);
        });
        it('different messages', () => {
            assert.equal(deepEqual(new Error('a'), new Error('b')), false);
        });
        it('different error types', () => {
            assert.equal(deepEqual(new Error('x'), new TypeError('x')), false);
        });
    });
    describe('URL', () => {
        it('equal URLs', () => {
            assert.equal(deepEqual(new URL('https://a.com'), new URL('https://a.com')), true);
        });
        it('different URLs', () => {
            assert.equal(deepEqual(new URL('https://a.com'), new URL('https://b.com')), false);
        });
    });
    describe('edge cases', () => {
        it('same reference', () => {
            const obj = { a: 1 };
            assert.equal(deepEqual(obj, obj), true);
        });
        it('prototype check', () => {
            class A {
                constructor() {
                    this.x = 1;
                }
            }
            class B {
                constructor() {
                    this.x = 1;
                }
            }
            assert.equal(deepEqual(new A(), new B()), false);
            assert.equal(deepEqual(new A(), new A()), true);
        });
        it('functions not deeply compared', () => {
            const fn = () => { };
            assert.equal(deepEqual(fn, fn), true); // same ref
            assert.equal(deepEqual(() => { }, () => { }), false); // different refs
        });
    });
});
describe('shallowEqual', () => {
    it('primitives', () => {
        assert.equal(shallowEqual(1, 1), true);
        assert.equal(shallowEqual('a', 'a'), true);
        assert.equal(shallowEqual(1, 2), false);
    });
    it('objects same values', () => {
        assert.equal(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }), true);
    });
    it('objects different values', () => {
        assert.equal(shallowEqual({ a: 1 }, { a: 2 }), false);
    });
    it('arrays', () => {
        assert.equal(shallowEqual([1, 2, 3], [1, 2, 3]), true);
        assert.equal(shallowEqual([1, 2, 3], [1, 2, 4]), false);
    });
    it('shallow comparison (not deep)', () => {
        const nested = { x: 1 };
        assert.equal(shallowEqual({ a: nested }, { a: nested }), true); // same ref
        assert.equal(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } }), false); // different refs
    });
    it('different key counts', () => {
        assert.equal(shallowEqual({ a: 1 }, { a: 1, b: 2 }), false);
    });
    it('same reference', () => {
        const obj = { a: 1 };
        assert.equal(shallowEqual(obj, obj), true);
    });
});
describe('deepClone', () => {
    it('primitives', () => {
        assert.equal(deepClone(42), 42);
        assert.equal(deepClone('hello'), 'hello');
        assert.equal(deepClone(null), null);
        assert.equal(deepClone(undefined), undefined);
    });
    it('arrays', () => {
        const orig = [1, [2, [3, [4]]]];
        const clone = deepClone(orig);
        assert.deepEqual(clone, orig);
        clone[1][1][1][0] = 99;
        assert.equal(orig[1][1][1][0], 4); // original unchanged
    });
    it('objects', () => {
        const orig = { a: { b: { c: 1 } } };
        const clone = deepClone(orig);
        assert.deepEqual(clone, orig);
        clone.a.b.c = 99;
        assert.equal(orig.a.b.c, 1);
    });
    it('Date', () => {
        const orig = new Date('2024-06-16');
        const clone = deepClone(orig);
        assert.equal(clone.getTime(), orig.getTime());
        clone.setDate(20);
        assert.notEqual(clone.getDate(), orig.getDate());
    });
    it('RegExp', () => {
        const orig = /test/gi;
        const clone = deepClone(orig);
        assert.equal(clone.source, orig.source);
        assert.equal(clone.flags, orig.flags);
    });
    it('Map', () => {
        const orig = new Map([['key', { val: 1 }]]);
        const clone = deepClone(orig);
        assert.equal(clone.get('key').val, 1);
        clone.get('key').val = 99;
        assert.equal(orig.get('key').val, 1);
    });
    it('Set', () => {
        const orig = new Set([{ x: 1 }]);
        const clone = deepClone(orig);
        const origVal = [...orig][0];
        const cloneVal = [...clone][0];
        assert.notEqual(origVal, cloneVal);
        assert.equal(cloneVal.x, 1);
    });
    it('circular references', () => {
        const orig = { x: 1 };
        orig.self = orig;
        const clone = deepClone(orig);
        assert.equal(clone.x, 1);
        assert.equal(clone.self, clone); // points to clone, not original
        assert.notEqual(clone.self, orig);
    });
    it('TypedArrays', () => {
        const orig = new Uint8Array([1, 2, 3]);
        const clone = deepClone(orig);
        assert.deepEqual(Array.from(clone), [1, 2, 3]);
        clone[0] = 99;
        assert.equal(orig[0], 1);
    });
    it('ArrayBuffer', () => {
        const orig = new ArrayBuffer(4);
        new Uint8Array(orig).set([1, 2, 3, 4]);
        const clone = deepClone(orig);
        assert.deepEqual(Array.from(new Uint8Array(clone)), [1, 2, 3, 4]);
    });
    it('preserves prototype chain', () => {
        class Person {
            constructor(name) {
                this.name = name;
            }
            greet() { return `Hi, I'm ${this.name}`; }
        }
        const orig = new Person('Alice');
        const clone = deepClone(orig);
        assert.equal(clone.name, 'Alice');
        assert.equal(clone.greet(), "Hi, I'm Alice");
        assert.equal(Object.getPrototypeOf(clone), Object.getPrototypeOf(orig));
    });
    it('Error objects', () => {
        const orig = new Error('test');
        const clone = deepClone(orig);
        assert.equal(clone.message, 'test');
        assert.equal(clone.name, 'Error');
    });
});
describe('diff', () => {
    it('equal values', () => {
        assert.deepEqual(diff({ a: 1 }, { a: 1 }), []);
    });
    it('primitive difference', () => {
        assert.deepEqual(diff(1, 2), ['']);
    });
    it('object key difference', () => {
        const result = diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } });
        assert.ok(result.includes('b.c'));
    });
    it('array difference', () => {
        const result = diff([1, 2, 3], [1, 2, 4]);
        assert.ok(result.some(r => r.includes('[2]')));
    });
    it('added key', () => {
        const result = diff({ a: 1 }, { a: 1, b: 2 });
        assert.ok(result.includes('b'));
    });
    it('removed key', () => {
        const result = diff({ a: 1, b: 2 }, { a: 1 });
        assert.ok(result.includes('b'));
    });
});
describe('createDeepEqualSelector', () => {
    it('tracks changes', () => {
        const selector = createDeepEqualSelector();
        assert.equal(selector.equals({ a: 1 }), false);
        selector.set({ a: 1 });
        assert.equal(selector.equals({ a: 1 }), true);
        assert.equal(selector.equals({ a: 2 }), false);
    });
    it('get returns stored value', () => {
        const selector = createDeepEqualSelector();
        selector.set({ x: 42 });
        assert.deepEqual(selector.get(), { x: 42 });
    });
});
