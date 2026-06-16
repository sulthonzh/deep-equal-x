/**
 * deep-equal-x — Zero-dependency deep structural equality, shallow equality, and deep clone.
 */
export type AnyVal = unknown;
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
export declare function deepEqual(a: AnyVal, b: AnyVal): boolean;
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
export declare function shallowEqual(a: AnyVal, b: AnyVal): boolean;
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
export declare function deepClone<T>(value: T, seen?: WeakMap<object, unknown>): T;
/**
 * Returns a function that memoizes deep-equality comparisons.
 * Useful when comparing against the same reference repeatedly.
 */
export declare function createDeepEqualSelector<T extends AnyVal>(): {
    equals(value: T): boolean;
    get(): T | undefined;
    set(value: T): void;
};
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
export declare function diff(a: AnyVal, b: AnyVal, prefix?: string): string[];
