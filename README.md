# deep-equal-x

Zero-dependency deep equality comparison with circular reference detection, special type support, and flexible matching modes.

## Why?

JavaScript's `===` only checks reference equality for objects. `JSON.stringify` ignores types (Date, RegExp, Map, Set) and throws on circular references. You need a proper deep equality check that handles real-world data without pulling in a 50KB dependency.

## Install

```bash
npm install deep-equal-x
```

## Quick Start

```js
import { deepEqual } from 'deep-equal-x';

deepEqual({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] }); // true
deepEqual(new Date('2024-01-01'), new Date('2024-01-01')); // true
deepEqual(new Map([['x', 1]]), new Map([['x', 1]])); // true
```

## Features

- **Zero dependencies** — nothing but Node.js
- **Circular reference safe** — detects cycles via WeakMap pair tracking
- **All JS types** — Date, RegExp, Map, Set, ArrayBuffer, typed arrays, Error, URL
- **Strict & loose modes** — `===` by default, `==` coercion optional
- **Partial matching** — check if an object is a subset of another
- **Key filtering** — ignore keys matching a pattern (e.g., timestamps, internal fields)
- **Structural diff** — get exact paths where two values differ
- **Depth limiting** — cap recursion depth for performance
- **Factory function** — create reusable comparators with preset options

## API

### `deepEqual(a, b, options?)` → `boolean`

Deep compare two values.

```js
deepEqual({ a: [1, 2] }, { a: [1, 2] }); // true

// Strict mode (default): 1 !== '1'
deepEqual(1, '1'); // false

// Loose mode: 1 == '1'
deepEqual(1, '1', { strict: false }); // true

// Ignore internal keys
deepEqual(
  { name: 'Alice', _ts: 123 },
  { name: 'Alice', _ts: 456 },
  { filter: (k) => !k.startsWith('_') }
); // true

// Limit recursion depth
deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } }, { depth: 1 }); // true (stops before diff)
```

### `deepEqualLoose(a, b, options?)` → `boolean`

Shorthand for `deepEqual(a, b, { strict: false })`.

```js
deepEqualLoose({ n: 1 }, { n: '1' }); // true
deepEqualLoose(null, undefined); // true
```

### `deepEqualPartial(subset, superset, options?)` → `boolean`

Check if all properties of `subset` exist and match in `superset`. Extra keys in `superset` are fine.

```js
deepEqualPartial({ a: 1 }, { a: 1, b: 2, c: 3 }); // true
deepEqualPartial({ a: 1, b: 2 }, { a: 1 }); // false (b missing)
deepEqualPartial({ user: { name: 'Alice' } }, { user: { name: 'Alice', age: 30 }, ts: 123 }); // true
```

Perfect for API response assertions where the server returns extra metadata you don't care about.

### `createDeepEqual(options)` → `Function`

Create a reusable comparator with preset options.

```js
const looseEq = createDeepEqual({ strict: false });
looseEq(1, '1'); // true
looseEq([1, 2], [1, 2]); // true

const ignorePrivates = createDeepEqual({ filter: (k) => !k.startsWith('_') });
ignorePrivates({ _id: 1, name: 'x' }, { _id: 2, name: 'x' }); // true
```

### `diff(a, b, options?)` → `Array<{ path, a, b }>`

Get structural differences between two values.

```js
const d = diff(
  { name: 'Alice', age: 30, city: 'Jakarta' },
  { name: 'Alice', age: 25, country: 'ID' }
);
// [
//   { path: 'age', a: 30, b: 25 },
//   { path: 'city', a: 'Jakarta', b: undefined },
//   { path: 'country', a: undefined, b: 'ID' }
// ]
```

## Supported Types

| Type | Comparison |
|------|-----------|
| Primitives | `===` (or `==` in loose mode) |
| NaN | Equal to itself |
| Objects | Key-by-key recursive |
| Arrays | Index-by-index recursive |
| Date | `.getTime()` equality |
| RegExp | `.source` + `.flags` |
| Map | Size + key/value pairs (deep) |
| Set | Size + element matching (deep) |
| ArrayBuffer | Byte-by-byte via Uint8Array |
| Typed Arrays | Element-by-element |
| Error | `.name` + `.message` + own props |
| URL | `.href` |
| Function | Reference (strict) or `.toString()` (loose) |
| Circular | Detected via WeakMap, no infinite loop |

## CLI

```bash
# Compare two JSON values
dequal '{"a":1}' '{"a":1}'          # ✓ Deeply equal
dequal '{"a":1}' '{"a":2}'          # ✗ Not equal

# Loose mode
dequal --loose '{"a":1}' '{"a":"1"}'  # ✓ Deeply equal

# Partial mode
dequal --partial '{"a":1}' '{"a":1,"b":2}'  # ✓ Deeply equal

# Show diffs
dequal --diff '{"a":1,"b":2}' '{"a":1,"b":3}'
# Found 1 difference(s):
#   b: 2 → 3

# Filter keys (ignore keys matching pattern)
dequal --filter '^_' '{"a":1,"_t":1}' '{"a":1,"_t":2}'  # ✓

# Run demo
dequal demo
```

## Use Cases

- **Test assertions** — `assert(deepEqual(result, expected))`
- **Change detection** — `if (!deepEqual(prev, next)) update()`
- **API testing** — `deepEqualPartial(expectedSubset, apiResponse)`
- **Cache invalidation** — `if (!deepEqual(cached, current)) invalidate()`
- **React/Vue props** — deep compare for shouldComponentUpdate
- **Config diffing** — `diff(oldConfig, newConfig)` for audit logs

## License

MIT
