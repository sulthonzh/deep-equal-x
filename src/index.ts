/**
 * deep-equal-x — Zero-dependency deep structural equality, shallow equality, and deep clone.
 */

// ─── Types ──────────────────────────────────────────────────────────────

export type AnyVal = unknown;

interface StackEntry {
  a: AnyVal;
  b: AnyVal;
}

// ─── Internal Helpers ───────────────────────────────────────────────────

const toString = Object.prototype.toString;

function getType(val: AnyVal): string {
  return toString.call(val).slice(8, -1);
}

function isObject(val: AnyVal): val is object {
  return typeof val === 'object' && val !== null;
}

function isArray(val: AnyVal): val is unknown[] {
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
export function deepEqual(a: AnyVal, b: AnyVal): boolean {
  // Quick reference check
  if (Object.is(a, b)) return true;

  // Null/undefined checks
  if (a === null || b === null || a === undefined || b === undefined) {
    return Object.is(a, b);
  }

  const typeA = typeof a;
  const typeB = typeof b;
  if (typeA !== typeB) return false;
  if (typeA !== 'object') return Object.is(a, b);

  // Both are objects from here
  const tagA = getType(a);
  const tagB = getType(b);
  if (tagA !== tagB) return false;

  // Circular reference tracking
  const stack: StackEntry[] = [];
  let cursor = 0;

  function check(x: AnyVal, y: AnyVal): boolean {
    if (Object.is(x, y)) return true;
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

  function deepCheck(x: AnyVal, y: AnyVal): boolean {
    const tag = getType(x);

    switch (tag) {
      case 'Array': {
        const arrX = x as unknown[];
        const arrY = y as unknown[];
        if (arrX.length !== arrY.length) return false;
        
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
        if (Object.getPrototypeOf(x) !== Object.getPrototypeOf(y)) return false;
        const keysX = Object.keys(x as Record<string, unknown>);
        const keysY = Object.keys(y as Record<string, unknown>);
        if (keysX.length !== keysY.length) return false;

        const objX = x as Record<string, AnyVal>;
        const objY = y as Record<string, AnyVal>;

        for (let i = 0; i < keysX.length; i++) {
          const key = keysX[i];
          if (!Object.prototype.hasOwnProperty.call(objY, key)) return false;
          if (!check(objX[key], objY[key])) return false;
        }
        return true;
      }

      case 'Date': {
        const d1 = x as Date;
        const d2 = y as Date;
        return Object.is(d1.getTime(), d2.getTime());
      }

      case 'RegExp': {
        const r1 = x as RegExp;
        const r2 = y as RegExp;
        return r1.source === r2.source && r1.flags === r2.flags;
      }

      case 'Map': {
        const m1 = x as Map<AnyVal, AnyVal>;
        const m2 = y as Map<AnyVal, AnyVal>;
        if (m1.size !== m2.size) return false;

        // Maps with object keys: we need to check in order since Map preserves insertion order
        // and uses reference equality for keys (unless SameValueZero matches)
        const entries1 = Array.from(m1.entries());
        const matched = new Set<number>();

        for (const [k1, v1] of entries1) {
          let found = false;
          let idx = 0;
          for (const [k2, v2] of m2.entries()) {
            if (matched.has(idx)) { idx++; continue; }
            if (check(k1, k2) && check(v1, v2)) {
              matched.add(idx);
              found = true;
              break;
            }
            idx++;
          }
          if (!found) return false;
        }
        return true;
      }

      case 'Set': {
        const s1 = x as Set<AnyVal>;
        const s2 = y as Set<AnyVal>;
        if (s1.size !== s2.size) return false;

        const values1 = Array.from(s1);
        const matched = new Set<number>();

        for (const v1 of values1) {
          let found = false;
          let idx = 0;
          for (const v2 of s2) {
            if (matched.has(idx)) { idx++; continue; }
            if (check(v1, v2)) {
              matched.add(idx);
              found = true;
              break;
            }
            idx++;
          }
          if (!found) return false;
        }
        return true;
      }

      case 'Error': {
        const e1 = x as Error;
        const e2 = y as Error;
        return e1.name === e2.name && e1.message === e2.message;
      }

      case 'URL': {
        const u1 = x as URL;
        const u2 = y as URL;
        return u1.href === u2.href;
      }

      case 'ArrayBuffer': {
        const b1 = x as ArrayBuffer;
        const b2 = y as ArrayBuffer;
        if (b1.byteLength !== b2.byteLength) return false;
        const v1 = new DataView(b1);
        const v2 = new DataView(b2);
        for (let i = 0; i < b1.byteLength; i++) {
          if (v1.getUint8(i) !== v2.getUint8(i)) return false;
        }
        return true;
      }

      case 'DataView': {
        const dv1 = x as DataView;
        const dv2 = y as DataView;
        if (dv1.byteLength !== dv2.byteLength) return false;
        for (let i = 0; i < dv1.byteLength; i++) {
          if (dv1.getUint8(i) !== dv2.getUint8(i)) return false;
        }
        return true;
      }

      default: {
        // TypedArrays: Int8Array, Uint8Array, Float64Array, BigInt64Array, etc.
        if (ArrayBuffer.isView(x) && ArrayBuffer.isView(y)) {
          const ta1 = x as unknown as ArrayLike<number | bigint>;
          const ta2 = y as unknown as ArrayLike<number | bigint>;
          if (ta1.length !== ta2.length) return false;
          for (let i = 0; i < ta1.length; i++) {
            if (ta1[i] !== ta2[i]) return false;
          }
          return true;
        }

        // Fallback: try keys comparison
        if (tag !== getType(y)) return false;
        const keysX = Object.keys(x as Record<string, AnyVal>);
        const keysY = Object.keys(y as Record<string, AnyVal>);
        if (keysX.length !== keysY.length) return false;

        const objX = x as Record<string, AnyVal>;
        const objY = y as Record<string, AnyVal>;
        for (let i = 0; i < keysX.length; i++) {
          const key = keysX[i];
          if (!Object.prototype.hasOwnProperty.call(objY, key)) return false;
          if (!check(objX[key], objY[key])) return false;
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
export function shallowEqual(a: AnyVal, b: AnyVal): boolean {
  if (Object.is(a, b)) return true;

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (isArray(a) && isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  if (isArray(a) || isArray(b)) return false;

  const objA = a as Record<string, AnyVal>;
  const objB = b as Record<string, AnyVal>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!Object.is(objA[key], objB[key])) return false;
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
export function deepClone<T>(value: T, seen = new WeakMap<object, AnyVal>()): T {
  // Primitives & functions return as-is
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Circular reference
  if (seen.has(value as object)) {
    return seen.get(value as object) as T;
  }

  // Date
  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  // RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags) as T;
  }

  // Array
  if (isArray(value)) {
    const arr: unknown[] = [];
    seen.set(value as object, arr);
    for (let i = 0; i < value.length; i++) {
      arr.push(deepClone(value[i], seen));
    }
    return arr as T;
  }

  // Map
  if (value instanceof Map) {
    const map = new Map<AnyVal, AnyVal>();
    seen.set(value as object, map);
    for (const [k, v] of value) {
      map.set(deepClone(k, seen), deepClone(v, seen));
    }
    return map as T;
  }

  // Set
  if (value instanceof Set) {
    const set = new Set<AnyVal>();
    seen.set(value as object, set);
    for (const v of value) {
      set.add(deepClone(v, seen));
    }
    return set as T;
  }

  // ArrayBuffer
  if (value instanceof ArrayBuffer) {
    const buf = value.slice(0);
    seen.set(value as object, buf);
    return buf as T;
  }

  // DataView
  if (value instanceof DataView) {
    const buf = value.buffer.slice(0);
    const dv = new DataView(buf, value.byteOffset, value.byteLength);
    seen.set(value as object, dv);
    return dv as T;
  }

  // TypedArrays
  if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
    const Ctor = (value as unknown as { constructor: { new(buffer: ArrayBuffer): unknown } }).constructor;
    const buf = (value as unknown as { buffer: ArrayBuffer }).buffer.slice(0);
    const ta = new Ctor(buf);
    seen.set(value as object, ta);
    return ta as T;
  }

  // Error
  if (value instanceof Error) {
    const err = new (value.constructor as { new(message: string): Error })(value.message);
    if ('cause' in value) {
      (err as Error & { cause?: unknown }).cause = deepClone((value as Error & { cause?: unknown }).cause, seen);
    }
    seen.set(value as object, err);
    return err as T;
  }

  // URL
  if (value instanceof URL) {
    return new URL((value as URL).href) as T;
  }

  // Plain object or class instance
  const proto = Object.getPrototypeOf(value);
  const cloned = Object.create(proto);
  seen.set(value as object, cloned);

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

  return cloned as T;
}

// ─── Extra Utilities ────────────────────────────────────────────────────

/**
 * Returns a function that memoizes deep-equality comparisons.
 * Useful when comparing against the same reference repeatedly.
 */
export function createDeepEqualSelector<T extends AnyVal>(): {
  equals(value: T): boolean;
  get(): T | undefined;
  set(value: T): void;
} {
  let stored: T | undefined;
  let hasValue = false;

  return {
    equals(value: T): boolean {
      if (!hasValue) return false;
      return deepEqual(stored, value);
    },
    get(): T | undefined {
      return stored;
    },
    set(value: T): void {
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
export function diff(a: AnyVal, b: AnyVal, prefix = ''): string[] {
  if (deepEqual(a, b)) return [];

  const results: string[] = [];

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
      } else if (i >= b.length) {
        results.push(path);
      } else if (!deepEqual(a[i], b[i])) {
        results.push(...diff(a[i], b[i], path));
      }
    }
    return results;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, AnyVal>;
    const objB = b as Record<string, AnyVal>;
    const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);

    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const hasA = Object.prototype.hasOwnProperty.call(objA, key);
      const hasB = Object.prototype.hasOwnProperty.call(objB, key);

      if (!hasA) {
        results.push(path);
      } else if (!hasB) {
        results.push(path);
      } else if (!deepEqual(objA[key], objB[key])) {
        if (isObject(objA[key]) && isObject(objB[key]) && !isArray(objA[key]) && !isArray(objB[key])) {
          results.push(...diff(objA[key], objB[key], path));
        } else {
          results.push(path);
        }
      }
    }
    return results;
  }

  return results;
}
