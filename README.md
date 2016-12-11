Grindelwald
===========

> Functional reactive programming with dark magic.

Grindelwald automatically tracks dependencies between your functions and only performs the minimial amount of computation when updates happen.

Grindelwald can replace [RxJS](https://github.com/Reactive-Extensions/RxJS) and [Bacon](https://github.com/baconjs/bacon.js/), except it's a tiny library that lets just write plain JS functions. You don't need to learn a whole new library to perform standard operations.

Grindelwald is perfect for memoizing functions that compute derived data from your Redux stores, similar to [Reselect](https://github.com/reactjs/reselect).

##Examples

```js
import {reactive} from 'grindelwald';

let start = 2;

const a = reactive(() => start);
const b = reactive(() => a() * 2);
const c = reactive(() => b() > 10);
const d = reactive(() => c() ? 40 : 20);
const e = reactive(() => c() ? 20 : 40);
const f = reactive(x => e() * x, x => x);

// runs a(), b(), c(), and d()
d() // => 20
// runs nothing
d() // => 20
// runs e()
e() // => 40
// runs nothing
e() // => 40
// runs f(2)
f(2) // => 80
// runs nothing
f(2) // => 80
// runs f(4)
f(4) // => 160

start = 6;
// runs nothing (nobody is listening for updates on these values yet!)
a.invalidate();

// runs a()
a() // => 6
// runs b(), c(), and e()
e() // => 20
// runs d()
d() // => 40
// runs f(2)
f(2) // => 40
// runs f(4)
f(4) // => 60

start = 12;
// runs nothing
a.invalidate();

// all of these run nothing, the return value of c() hasn't changed!
d() // => 40
e() // => 20
f(2) // => 40
f(4) // => 60

// Now we have a subscriber in the system, updates are no longer lazy
e.subscribe(console.log);

start = 10;
// runs a(), b(), c()... then stops because c()'s value hasn't changed
a.invalidate();

start = 0;
// runs a(), b(), c(), and e()
// d() is skipped because the listener does not depend on it
a.invalidate();
```

Check the source for advanced features, like automatically subscribing and unsubscribing your own functions and components based on which reactive functions they call!
