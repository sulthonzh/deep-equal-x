import { deepEqual } from './dist/index.js';

class A { constructor(x) { this.x = x; } }
class B { constructor(x) { this.x = x; } }

console.log('A(1) vs B(1):', deepEqual(new A(1), new B(1)));
console.log('A(1) vs A(1):', deepEqual(new A(1), new A(1)));