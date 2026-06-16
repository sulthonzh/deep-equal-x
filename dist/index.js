/**
 * deep-equal-x — Zero-dependency deep structural equality, shallow equality, and deep clone.
 */
// ─── Internal Helpers ───────────────────────────────────────────────────
const toString = Object.prototype.toString;
function getType(val) {
    return toString.call(val).slice(8, -1);
}
function isObject(val) {
    return typeof val === 'object' && val !== null;
}
function isArray(val) {
    return Array.isArray(val);
}
// ─── Deep Equal ─────────────────────────────────────────────────────────
/**
 * Performs a deep structural equality check between two values.
 *
 * Handles: primitives, arrays, plain objects, Date, RegExp, Map, Set,
 * TypedArrays, ArrayBuffer, Error, URL, and circular references.
 *
 * @example
 * ```ts
 * deepEqual({ a: [1, 2] }, { a: [1, 2] }); // true
 * deepEqual([1, 2, 3], [1, 2, 4]);          // false
 * ```
 */
export function deepEqual(a, b) {
    // Quick reference check
    if (Object.is(a, b))
        return true;
    // Null/undefined checks
    if (a === null || b === null || a === undefined || b === undefined) {
        return Object.is(a, b);
    }
    const typeA = typeof a;
    const typeB = typeof b;
    if (typeA !== typeB)
        return false;
    if (typeA !== 'object')
        return Object.is(a, b);
    // Both are objects from here
    const tagA = getType(a);
    const tagB = getType(b);
    if (tagA !== tagB)
        return false;
    // Circular reference tracking
    const stack = [];
    let cursor = 0;
    function check(x, y) {
        if (Object.is(x, y))
            return true;
        if (x === null || y === null || typeof x !== 'object' || typeof y !== 'object') {
            return Object.is(x, y);
        }
        // Check circular refs
        for (let i = 0; i < cursor; i++) {
            if ((stack[i].a === x && stack[i].b === y) || (stack[i].a === y && stack[i].b === x)) {
                return true;
            }
        }
        stack[cursor] = { a: x, b: y };
        cursor++;
        const result = deepCheck(x, y);
        cursor--;
        return result;
    }
    function deepCheck(x, y) {
        const tag = getType(x);
        switch (tag) {
            case 'Array': {
                const arrX = x;
                const arrY = y;
                if (arrX.length !== arrY.length)
                    return false;
                // Check if arrays have the same sparse pattern
                for (let i = 0; i < arrX.length; i++) {
                    if (!(i in arrX) !== !(i in arrY)) {
                        return false; // Different sparsity pattern
                    }
                    if (i in arrX && i in arrY && !check(arrX[i], arrY[i])) {
                        return false;
                    }
                }
                return true;
            }
            case 'Object': {
                // Check prototype chain
                if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y))
                    return false;
                const keysX = Object.keys(x);
                const keysY = Object.keys(y);
                if (keysX.length !== keysY.length)
                    return false;
                const objX = x;
                const objY = y;
                for (let i = 0; i < keysX.length; i++) {
                    const key = keysX[i];
                    if (!Object.prototype.hasOwnProperty.call(objY, key))
                        return false;
                    if (!check(objX[key], objY[key]))
                        return false;
                }
                return true;
            }
            case 'Date': {
                const d1 = x;
                const d2 = y;
                return Object.is(d1.getTime(), d2.getTime());
            }
            case 'RegExp': {
                const r1 = x;
                const r2 = y;
                return r1.source === r2.source && r1.flags === r2.flags;
            }
            case 'Map': {
                const m1 = x;
                const m2 = y;
                if (m1.size !== m2.size)
                    return false;
                // Maps with object keys: we need to check in order since Map preserves insertion order
                // and uses reference equality for keys (unless SameValueZero matches)
                const entries1 = Array.from(m1.entries());
                const matched = new Set();
                for (const [k1, v1] of entries1) {
                    let found = false;
                    let idx = 0;
                    for (const [k2, v2] of m2.entries()) {
                        if (matched.has(idx)) {
                            idx++;
                            continue;
                        }
                        if (check(k1, k2) && check(v1, v2)) {
                            matched.add(idx);
                            found = true;
                            break;
                        }
                        idx++;
                    }
                    if (!found)
                        return false;
                }
                return true;
            }
            case 'Set': {
                const s1 = x;
                const s2 = y;
                if (s1.size !== s2.size)
                    return false;
                const values1 = Array.from(s1);
                const matched = new Set();
                for (const v1 of values1) {
                    let found = false;
                    let idx = 0;
                    for (const v2 of s2) {
                        if (matched.has(idx)) {
                            idx++;
                            continue;
                        }
                        if (check(v1, v2)) {
                            matched.add(idx);
                            found = true;
                            break;
                        }
                        idx++;
                    }
                    if (!found)
                        return false;
                }
                return true;
            }
            case 'Error': {
                const e1 = x;
                const e2 = y;
                return e1.name === e2.name && e1.message === e2.message;
            }
            case 'URL': {
                const u1 = x;
                const u2 = y;
                return u1.href === u2.href;
            }
            case 'ArrayBuffer': {
                const b1 = x;
                const b2 = y;
                if (b1.byteLength !== b2.byteLength)
                    return false;
                const v1 = new DataView(b1);
                const v2 = new DataView(b2);
                for (let i = 0; i < b1.byteLength; i++) {
                    if (v1.getUint8(i) !== v2.getUint8(i))
                        return false;
                }
                return true;
            }
            case 'DataView': {
                const dv1 = x;
                const dv2 = y;
                if (dv1.byteLength !== dv2.byteLength)
                    return false;
                for (let i = 0; i < dv1.byteLength; i++) {
                    if (dv1.getUint8(i) !== dv2.getUint8(i))
                        return false;
                }
                return true;
            }
            default: {
                // TypedArrays: Int8Array, Uint8Array, Float64Array, BigInt64Array, etc.
                if (ArrayBuffer.isView(x) && ArrayBuffer.isView(y)) {
                    const ta1 = x;
                    const ta2 = y;
                    if (ta1.length !== ta2.length)
                        return false;
                    for (let i = 0; i < ta1.length; i++) {
                        if (ta1[i] !== ta2[i])
                            return false;
                    }
                    return true;
                }
                // Fallback: try keys comparison
                if (tag !== getType(y))
                    return false;
                const keysX = Object.keys(x);
                const keysY = Object.keys(y);
                if (keysX.length !== keysY.length)
                    return false;
                const objX = x;
                const objY = y;
                for (let i = 0; i < keysX.length; i++) {
                    const key = keysX[i];
                    if (!Object.prototype.hasOwnProperty.call(objY, key))
                        return false;
                    if (!check(objX[key], objY[key]))
                        return false;
                }
                return true;
            }
        }
    }
    return check(a, b);
}
// ─── Shallow Equal ──────────────────────────────────────────────────────
/**
 * Performs a shallow equality check (one level deep).
 * Compares primitives directly; for objects/arrays, checks key-length
 * and top-level values with Object.is().
 *
 * @example
 * ```ts
 * shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
 * shallowEqual({ a: [1] }, { a: [1] });          // false (different refs)
 * ```
 */
export function shallowEqual(a, b) {
    if (Object.is(a, b))
        return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        return false;
    }
    if (isArray(a) && isArray(b)) {
        if (a.length !== b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (!Object.is(a[i], b[i]))
                return false;
        }
        return true;
    }
    if (isArray(a) || isArray(b))
        return false;
    const objA = a;
    const objB = b;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length)
        return false;
    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        if (!Object.prototype.hasOwnProperty.call(objB, key))
            return false;
        if (!Object.is(objA[key], objB[key]))
            return false;
    }
    return true;
}
// ─── Deep Clone ─────────────────────────────────────────────────────────
/**
 * Creates a deep clone of any value.
 * Handles: primitives, arrays, plain objects, Date, RegExp, Map, Set,
 * TypedArrays, ArrayBuffer, Error, and circular references.
 *
 * Preserves prototype chain for class instances.
 *
 * @example
 * ```ts
 * const original = { nested: { arr: [1, 2, { x: 'y' }] } };
 * const clone = deepClone(original);
 * clone.nested.arr[0] = 99;
 * original.nested.arr[0]; // still 1
 * ```
 */
export function deepClone(value, seen = new WeakMap()) {
    // Primitives & functions return as-is
    if (value === null || typeof value !== 'object') {
        return value;
    }
    // Circular reference
    if (seen.has(value)) {
        return seen.get(value);
    }
    // Date
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    // RegExp
    if (value instanceof RegExp) {
        return new RegExp(value.source, value.flags);
    }
    // Array
    if (isArray(value)) {
        const arr = [];
        seen.set(value, arr);
        for (let i = 0; i < value.length; i++) {
            arr.push(deepClone(value[i], seen));
        }
        return arr;
    }
    // Map
    if (value instanceof Map) {
        const map = new Map();
        seen.set(value, map);
        for (const [k, v] of value) {
            map.set(deepClone(k, seen), deepClone(v, seen));
        }
        return map;
    }
    // Set
    if (value instanceof Set) {
        const set = new Set();
        seen.set(value, set);
        for (const v of value) {
            set.add(deepClone(v, seen));
        }
        return set;
    }
    // ArrayBuffer
    if (value instanceof ArrayBuffer) {
        const buf = value.slice(0);
        seen.set(value, buf);
        return buf;
    }
    // DataView
    if (value instanceof DataView) {
        const buf = value.buffer.slice(0);
        const dv = new DataView(buf, value.byteOffset, value.byteLength);
        seen.set(value, dv);
        return dv;
    }
    // TypedArrays
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        const Ctor = value.constructor;
        const buf = value.buffer.slice(0);
        const ta = new Ctor(buf);
        seen.set(value, ta);
        return ta;
    }
    // Error
    if (value instanceof Error) {
        const err = new value.constructor(value.message);
        if ('cause' in value) {
            err.cause = deepClone(value.cause, seen);
        }
        seen.set(value, err);
        return err;
    }
    // URL
    if (value instanceof URL) {
        return new URL(value.href);
    }
    // Plain object or class instance
    const proto = Object.getPrototypeOf(value);
    const cloned = Object.create(proto);
    seen.set(value, cloned);
    const keys = [...Object.getOwnPropertyNames(value), ...Object.getOwnPropertySymbols(value)];
    for (const key of keys) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (descriptor) {
            if (descriptor.value !== undefined) {
                descriptor.value = deepClone(descriptor.value, seen);
            }
            Object.defineProperty(cloned, key, descriptor);
        }
    }
    return cloned;
}
// ─── Extra Utilities ────────────────────────────────────────────────────
/**
 * Returns a function that memoizes deep-equality comparisons.
 * Useful when comparing against the same reference repeatedly.
 */
export function createDeepEqualSelector() {
    let stored;
    let hasValue = false;
    return {
        equals(value) {
            if (!hasValue)
                return false;
            return deepEqual(stored, value);
        },
        get() {
            return stored;
        },
        set(value) {
            stored = value;
            hasValue = true;
        },
    };
}
/**
 * Finds the differences between two values.
 * Returns an array of paths where values differ.
 *
 * @example
 * ```ts
 * diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } });
 * // ['.b.c']
 * ```
 */
export function diff(a, b, prefix = '') {
    if (deepEqual(a, b))
        return [];
    const results = [];
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        results.push(prefix);
        return results;
    }
    if (isArray(a) && isArray(b)) {
        const maxLen = Math.max(a.length, b.length);
        for (let i = 0; i < maxLen; i++) {
            const path = `${prefix}[${i}]`;
            if (i >= a.length) {
                results.push(path);
            }
            else if (i >= b.length) {
                results.push(path);
            }
            else if (!deepEqual(a[i], b[i])) {
                results.push(...diff(a[i], b[i], path));
            }
        }
        return results;
    }
    if (typeof a === 'object' && typeof b === 'object') {
        const objA = a;
        const objB = b;
        const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
        for (const key of allKeys) {
            const path = prefix ? `${prefix}.${key}` : key;
            const hasA = Object.prototype.hasOwnProperty.call(objA, key);
            const hasB = Object.prototype.hasOwnProperty.call(objB, key);
            if (!hasA) {
                results.push(path);
            }
            else if (!hasB) {
                results.push(path);
            }
            else if (!deepEqual(objA[key], objB[key])) {
                if (isObject(objA[key]) && isObject(objB[key]) && !isArray(objA[key]) && !isArray(objB[key])) {
                    results.push(...diff(objA[key], objB[key], path));
                }
                else {
                    results.push(path);
                }
            }
        }
        return results;
    }
    return results;
}
