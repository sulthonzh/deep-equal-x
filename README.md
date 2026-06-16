# deep-equal-x

Zero-dependency deep structural equality, shallow equality, deep clone, and diff for JavaScript/TypeScript.

No external dependencies. No polyfills. Just clean, fast, well-tested code.

## Install

```bash
npm install deep-equal-x
```

## Why?

Because most deep-equal libraries either pull in 50KB of dependencies, don't handle edge cases (circular refs, Maps, Sets, TypedArrays), or both. `deep-equal-x` handles all of them in a single file with zero dependencies.

## API

### `deepEqual(a, b): boolean`

Deep structural equality check. Compares recursively.

**Handles:** primitives, arrays, plain objects, `Date`, `RegExp`, `Map`, `Set`, `TypedArrays` (`Uint8Array`, `Float64Array`, etc.), `ArrayBuffer`, `DataView`, `Error`, `URL`, circular references, and prototype chains.

```ts
import { deepEqual } from 'deep-equal-x';

deepEqual({ a: [1, 2, 3] }, { a: [1, 2, 3] }); // true
deepEqual(new Date('2024-01-01'), new Date('2024-01-01')); // true
deepEqual(/abc/gi, /abc/gi); // true
deepEqual(new Map([['k', 'v']]), new Map([['k', 'v']])); // true
deepEqual(new Set([1, 2, 3]), new Set([1, 2, 3])); // true

// Circular references
const a: any = { x: 1 };
a.self = a;
const b: any = { x: 1 };
b.self = b;
deepEqual(a, b); // true

// Prototype-aware
class Foo { x = 1 }
class Bar { x = 1 }
deepEqual(new Foo(), new Bar()); // false (different prototypes)
```

### `shallowEqual(a, b): boolean`

One-level comparison. Compares primitives with `Object.is()`, checks object key count and top-level values.

```ts
import { shallowEqual } from 'deep-equal-x';

shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 }); // true
shallowEqual({ a: { x: 1 } }, { a: { x: 1 } }); // false (different refs at depth 1)

const ref = { x: 1 };
shallowEqual({ a: ref }, { a: ref }); // true (same ref)
```

### `deepClone(value): T`

Deep clone that preserves prototypes, handles circular references, and supports all the same types as `deepEqual`.

```ts
import { deepClone } from 'deep-equal-x';

const original = { nested: { arr: [1, 2, { x: 'y' }] } };
const clone = deepClone(original);
clone.nested.arr[2].x = 'z';
console.log(original.nested.arr[2].x); // 'y' — original unchanged

// Works with Maps, Sets, Dates, RegExps, TypedArrays, etc.
const complex = {
  date: new Date(),
  map: new Map([['key', { val: 42 }]]),
  set: new Set([1, 2, 3]),
  buffer: new Uint8Array([1, 2, 3]),
};
const cloned = deepClone(complex);
// Everything is independent of the original
```

### `diff(a, b, prefix?): string[]`

Returns paths where two values differ. Useful for debugging and change detection.

```ts
import { diff } from 'deep-equal-x';

diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } });
// ['b.c']

diff([1, 2, 3], [1, 2, 4]);
// ['[2]']

diff({ a: 1 }, { a: 1, b: 2 });
// ['b']  — key added
```

### `createDeepEqualSelector()`

Memoization helper using deep equality. Useful for React-like change detection or caching.

```ts
import { createDeepEqualSelector } from 'deep-equal-x';

const selector = createDeepEqualSelector();
selector.set({ filters: { category: 'books' } });

selector.equals({ filters: { category: 'books' } }); // true
selector.equals({ filters: { category: 'electronics' } }); // false
```

## Supported Types

| Type | deepEqual | deepClone |
|------|-----------|-----------|
| Primitives | ✅ | ✅ |
| Arrays (incl. sparse) | ✅ | ✅ |
| Plain Objects | ✅ | ✅ |
| Date | ✅ | ✅ |
| RegExp | ✅ | ✅ |
| Map | ✅ | ✅ |
| Set | ✅ | ✅ |
| TypedArrays | ✅ | ✅ |
| ArrayBuffer | ✅ | ✅ |
| DataView | ✅ | ✅ |
| Error | ✅ | ✅ |
| URL | ✅ | ✅ |
| Circular Refs | ✅ | ✅ |
| Prototype Chain | ✅ | ✅ |

## Performance

- Circular reference detection uses a stack-based approach (O(n) for typical objects)
- `shallowEqual` is O(n) where n = number of keys
- `deepClone` uses `WeakMap` for circular reference tracking
- No recursion depth issues for typical objects (stack-based deepEqual)

## License

MIT
