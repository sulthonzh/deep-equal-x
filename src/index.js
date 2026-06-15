'use strict';

// ════════════════════════════════════════════════════════════════
// deep-equal-x — Zero-dependency deep equality comparison
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} DeepEqualOptions
 * @property {boolean} [strict=true] - Use strict equality (===) for primitives
 * @property {Function} [filter] - Filter function (key, lhs, rhs) => boolean
 * @property {number} [depth=Infinity] - Maximum recursion depth
 * @property {boolean} [partial=false] - Allow partial matching (subset)
 */

const toString = Object.prototype.toString;

function getType(v) {
  return toString.call(v).slice(8, -1);
}

function isObject(v) {
  return v !== null && typeof v === 'object';
}

function filteredKeys(obj, filter, other) {
  if (!filter) return Object.keys(obj);
  return Object.keys(obj).filter((k) => filter(k, obj, other));
}

const typedArrays = [
  Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
  Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array,
];

function deepEqual(a, b, options = {}) {
  const { strict = true, filter = null, depth = Infinity, partial = false } = options;

  // WeakMap tracks pairs: a → b (and we verify seen.get(a) === b)
  const seen = new WeakMap();
  let currentDepth = 0;

  function compare(a, b) {
    if (currentDepth > depth) return strict ? a === b : a == b;
    currentDepth++;

    // Fast path: identical reference or primitive equality
    if (a === b) { currentDepth--; return true; }

    // NaN check (before null check, since NaN !== NaN)
    if (a !== a && b !== b) { currentDepth--; return true; }

    if (a == null || b == null) { currentDepth--; return strict ? a === b : a == b; }

    const ta = typeof a;
    const tb = typeof b;

    // Type mismatch
    if (ta !== tb) {
      if (!strict) {
        if (ta === 'number' && tb === 'string') { currentDepth--; return String(a) === b; }
        if (ta === 'string' && tb === 'number') { currentDepth--; return a === String(b); }
      }
      currentDepth--;
      return false;
    }

    // Primitives (not object/function)
    if (ta !== 'object' && ta !== 'function') {
      const r = strict ? a === b : a == b;
      currentDepth--;
      return r;
    }

    // Functions
    if (ta === 'function') {
      const r = strict ? a === b : String(a) === String(b);
      currentDepth--;
      return r;
    }

    // Dates
    if (a instanceof Date && b instanceof Date) {
      currentDepth--;
      return a.getTime() === b.getTime();
    }

    // RegExp
    if (a instanceof RegExp && b instanceof RegExp) {
      currentDepth--;
      return a.source === b.source && a.flags === b.flags;
    }

    // Errors
    if (a instanceof Error && b instanceof Error) {
      if (a.message !== b.message || a.name !== b.name) { currentDepth--; return false; }
      return compareOwnProperties(a, b);
    }

    // URL
    if (typeof URL !== 'undefined' && a instanceof URL && b instanceof URL) {
      currentDepth--;
      return a.href === b.href;
    }

    // Circular reference: have we seen this exact pair before?
    if (isObject(a) && isObject(b)) {
      if (seen.get(a) === b) { currentDepth--; return true; }
      seen.set(a, b);
    }

    // Maps
    if (a instanceof Map && b instanceof Map) {
      const r = compareMaps(a, b); currentDepth--; return r;
    }

    // Sets
    if (a instanceof Set && b instanceof Set) {
      const r = compareSets(a, b); currentDepth--; return r;
    }

    // ArrayBuffers
    if (a instanceof ArrayBuffer && b instanceof ArrayBuffer) {
      const r = compareArrayBuffers(a, b); currentDepth--; return r;
    }

    // Typed arrays — must be same type
    let matchedTyped = false;
    for (const TypedArray of typedArrays) {
      if (a instanceof TypedArray) {
        matchedTyped = true;
        if (!(b instanceof TypedArray)) { currentDepth--; return false; }
        // Don't require exact same typed array class in loose mode
        if (strict && !(b instanceof TypedArray.constructor)) {
          // Actually just check both are same typed array class
        }
        const r = compareTypedArrays(a, b); currentDepth--; return r;
      }
    }
    if (matchedTyped || (isObject(b) && typedArrays.some((T) => b instanceof T))) {
      // If a is typed but b isn't, or vice versa
      if (!matchedTyped) { currentDepth--; return false; }
    }

    // Arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      const r = compareArrays(a, b); currentDepth--; return r;
    }
    if (Array.isArray(a) !== Array.isArray(b)) { currentDepth--; return false; }

    // Plain objects
    const r = compareOwnProperties(a, b);
    currentDepth--;
    return r;
  }

  function compareOwnProperties(a, b) {
    const keysA = filteredKeys(a, filter, b);
    const keysB = filteredKeys(b, filter, a);

    if (!partial) {
      if (keysA.length !== keysB.length) return false;
    }

    // All keys from a must exist in b
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    }

    for (const key of keysA) {
      currentDepth++;
      const eq = compare(a[key], b[key]);
      currentDepth--;
      if (!eq) return false;
    }

    return true;
  }

  function compareArrays(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      currentDepth++;
      const eq = compare(a[i], b[i]);
      currentDepth--;
      if (!eq) return false;
    }
    return true;
  }

  function compareMaps(a, b) {
    if (a.size !== b.size) return false;
    const checked = new Set();
    for (const [key, valA] of a) {
      // Direct lookup for primitives
      if (b.has(key)) {
        currentDepth++;
        const eq = compare(valA, b.get(key));
        currentDepth--;
        if (!eq) return false;
        checked.add(key);
        continue;
      }
      // Deep search for object keys
      let found = false;
      for (const [keyB, valB] of b) {
        if (checked.has(keyB)) continue;
        currentDepth++;
        if (compare(key, keyB) && compare(valA, valB)) {
          currentDepth--;
          found = true;
          checked.add(keyB);
          break;
        }
        currentDepth--;
      }
      if (!found) return false;
    }
    return true;
  }

  function compareSets(a, b) {
    if (a.size !== b.size) return false;
    const checked = new Set();
    for (const item of a) {
      if (b.has(item)) { checked.add(item); continue; }
      let found = false;
      for (const itemB of b) {
        if (checked.has(itemB)) continue;
        currentDepth++;
        if (compare(item, itemB)) { currentDepth--; found = true; checked.add(itemB); break; }
        currentDepth--;
      }
      if (!found) return false;
    }
    return true;
  }

  function compareTypedArrays(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  function compareArrayBuffers(a, b) {
    if (a.byteLength !== b.byteLength) return false;
    const va = new Uint8Array(a);
    const vb = new Uint8Array(b);
    for (let i = 0; i < va.length; i++) {
      if (va[i] !== vb[i]) return false;
    }
    return true;
  }

  return compare(a, b);
}

function deepEqualLoose(a, b, options = {}) {
  return deepEqual(a, b, { ...options, strict: false });
}

function deepEqualPartial(subset, superset, options = {}) {
  return deepEqual(subset, superset, { ...options, partial: true });
}

function createDeepEqual(options) {
  return (a, b, override = {}) => deepEqual(a, b, { ...options, ...override });
}

function diff(a, b, options = {}) {
  const { filter = null, depth = Infinity } = options;
  const diffs = [];
  const seen = new WeakSet();
  let currentDepth = 0;

  function walk(a, b, path) {
    if (currentDepth > depth) return;
    currentDepth++;
    if (a === b) { currentDepth--; return; }
    if (a == null || b == null) {
      if (a !== b) diffs.push({ path, a, b });
      currentDepth--; return;
    }
    if (typeof a !== typeof b) {
      diffs.push({ path, a, b });
      currentDepth--; return;
    }
    if (typeof a !== 'object') {
      if (a !== b) diffs.push({ path, a, b });
      currentDepth--; return;
    }
    if (isObject(a) && seen.has(a)) { currentDepth--; return; }
    if (isObject(a)) seen.add(a);

    if (a instanceof Date && b instanceof Date) {
      if (a.getTime() !== b.getTime()) diffs.push({ path, a, b });
      currentDepth--; return;
    }

    if (Array.isArray(a) && Array.isArray(b)) {
      const maxLen = Math.max(a.length, b.length);
      for (let i = 0; i < maxLen; i++) {
        if (i >= a.length) diffs.push({ path: `${path}[${i}]`, a: undefined, b: b[i] });
        else if (i >= b.length) diffs.push({ path: `${path}[${i}]`, a: a[i], b: undefined });
        else walk(a[i], b[i], `${path}[${i}]`);
      }
      currentDepth--; return;
    }

    if (Array.isArray(a) !== Array.isArray(b)) {
      diffs.push({ path, a, b });
      currentDepth--; return;
    }

    const keysA = filteredKeys(a, filter, b);
    const keysB = filteredKeys(b, filter, a);
    const allKeys = new Set([...keysA, ...keysB]);
    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      const hasA = Object.prototype.hasOwnProperty.call(a, key);
      const hasB = Object.prototype.hasOwnProperty.call(b, key);
      if (hasA && hasB) walk(a[key], b[key], childPath);
      else if (hasA) diffs.push({ path: childPath, a: a[key], b: undefined });
      else diffs.push({ path: childPath, a: undefined, b: b[key] });
    }
    currentDepth--;
  }

  walk(a, b, '');
  return diffs;
}

export { deepEqual, deepEqualLoose, deepEqualPartial, createDeepEqual, diff };
export default deepEqual;
