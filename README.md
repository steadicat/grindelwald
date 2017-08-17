
Grindelwald [![Build Status](https://travis-ci.org/steadicat/grindelwald.svg?branch=master)](https://travis-ci.org/steadicat/grindelwald) [![NPM](https://img.shields.io/npm/v/grindelwald.svg)](https://www.npmjs.com/package/grindelwald)
===========

> Functional reactive programming with dark magic.

Grindelwald automatically tracks dependencies between your functions and only performs the minimal amount of computation when updates happen.

Grindelwald can replace [RxJS](https://github.com/Reactive-Extensions/RxJS) and [Bacon](https://github.com/baconjs/bacon.js/), except it's a tiny library that lets you write plain JS functions. You don't need to learn a whole new library to perform standard operations.

Grindelwald is perfect for memoizing functions that compute derived data from your Redux stores, similar to [Reselect](https://github.com/reactjs/reselect). It can even replace [Redux](http://redux.js.org) (or [MobX](https://mobx.js.org)) entirely.

## Examples

```js
import {reactive} from 'grindelwald';

let start = 2;

// a() simply returns the value of start.
const a = reactive(() => start);

// b() calls a(), so a dependency from b to a is created.
// b() will run again only if the result of a() changes.
const b = reactive(() => a() * 2);
const c = reactive(() => b() > 10);
const d = reactive(() => c() ? 40 : 20);
const e = reactive(() => c() ? 20 : 40);

// Reactive functions can also take parameters. The only requirement
// is a second argument to reactive(), which is a function that computes
// a cache key based on the parameters. `x => x` is often all that's needed.
const f = reactive(x => e() * x, x => x);

// The first function call behaves as usual,
// all dependencies are called: a(), b(), c(), and d()
d() // => 20
// Second call: nothing's changed, so nothing runs!
// We just return the memoized value.
d() // => 20
// e() depends only on c() which just ran,
// so only e() runs and returns.
e() // => 40
// As before, a second call runs nothing, just returns
// the cached value from the previous run.
e() // => 40
// As usual, first call runs f(2).
f(2) // => 80
// Subsequent calls with the same parameters run nothing.
f(2) // => 80
// If we call f() with new parameters, f() runs again!
// All results are memoized based on the input parameters.
f(4) // => 160

// Now let's see what happens when something changes.
start = 6;

// a() has no dependencies, so it won't run again unless we tell it to.
// This is what .update() is for. This only runs the function immediately
// if there are subscribers (see below). In this case, there are none,
// so nothing runs until a() is called again.
a.update();

// a() is called for the first time after being .update()d,
// so it runs again and returns the new value of start.
a() // => 6
// a() returned a new value so all its dependencies are invalidated.
// Calling e() runs e's dependecies again except a(), which just ran.
// b(), c(), and e() are called.
e() // => 20
// runs d()
d() // => 40
// runs f(2)
f(2) // => 40
// runs f(4)
f(4) // => 60

// Now let's see what happens when some functions return
// the same value as they did in a previous run.
start = 12;
// Again, no subscribers yet, so runs nothing.
a.update();

// c() runs, and returns the same value as before (true),
// so none of its dependencies run!
d() // => 40
e() // => 20
f(2) // => 40
f(4) // => 60
```

## Subscriptions

You can subscribe to any reactive function with `f.subscribe(listener)`. Your listener will be called any time `f` returns a *new value*.

Adding a subscriber changes a reactive function (and all its dependencies) to no longer be lazy. This means that any time something changes, the function will immediately run and notify its subscribers, without anyone having to call it.

In other words, by default a reactive function is *pull*-based: it runs when called, like a regular function. Adding a subscriber downstream changes the function to be *push*-based: it runs whenever it's invalidated, and notifies its subscribers.

```js
// Now we have a subscriber in the system, updates are no longer lazy.
e.subscribe(value => console.log(`Subscriber got: ${value}`));

// Let's trigger another state change.
start = 10;
// There are subscribers downstream of this function now,
// so we immediately run a(), b(), c()... then we stop because
// c()'s value hasn't changed. e()'s subscriber does not get called.
a.update();

// Now let's make a bigger change.
start = 0;
// Immediately runs a(), b(), c(), and e(), then calls the subscriber
// with the new return value of e(). d() is skipped because
// the listener does not depend on it.
a.update();
// > Subscriber got: 40
```

## Autosubscribing

Sometimes we need to subscribe to a bunch of functions and run something when any of them changes. This is common in React, when a component depends on multiple pieces of data, and when any of them changes we need to rerender. Instead of explicitly calling `subscribe()` on every function you depend on, Grindelwald can automatically subscribe for you to any reactive functions you call. Just wrap your code in an `autosubscribe` call:

```js
import {reactive, autosubscribe} from 'grindelwald';

let state = 1;
const a = reactive(() => start);
const b = reactive(() => a() * 2);
const c = reactive(() => b() > 10);

function onUpdate() { console.log('Something changed'); }

// Automatically subscribes onUpdate() to both a() and b().
autosubscribe(onUpdate, () => a() * b());

// Now we've called b() and c() instead, so onUpdate unsubscribes
// from a() and subscribes to c()! 
autosubscribe(onUpdate, () => c() ? a() : b());

let state = 6;

// Invalidating a() triggers b(), which triggers c().
// b() and c() are both subscribed to, and since both
// returned new values, our listener gets called:
a.update();
// > Something changed

// c() is now true, so a() and c() are called: onUpdate unsubscribes
// from b() and subscribes back to a()!
autosubscribe(onUpdate, () => c() ? a() : b());

// To unsubscribe from everything, simply call autosubscribe with an empty function:
autosubscribe(onUpdate, () => {});
```

## Usage with React

It's easy to subscribe a React component to a bunch of reactive functions using `autosubscribe`:

```js
import {reactive, autosubscribe} from 'grindelwald';

let state = 1;
const a = reactive(() => start);
const b = reactive(() => a() * 2);
const c = reactive(() => b() > 10);

class Thing extends React.Component {
  componentWillUnmount() {
    // Unsubscribe from everything by calling nothing.
    autosubscribe(this.onUpdate, () => {});
  }
  
  onUpdate = () => {
    this.forceUpdate();
  }
  
  render() {
    // Subscribes to c() (and any of its dependencies). onUpdate() will be called on any change.
    return autosubscribe(
      this.onUpdate,
      () => <div>{c()}</div>,
    );
  }
}
```

You can extract this logic into a higher-order component, or – even better – a higher-order function that wraps a render function:

```js
import {reactive, autosubscribe} from 'grindelwald';

function reactiveComponent(render) {
  return class ReactiveComponent extends React.Component {
    componentWillUnmount() {
      autosubscribe(this.onUpdate, () => {});
    }

    onUpdate = () => {
      this.forceUpdate();
    }

    render() {
      return autosubscribe(this.onUpdate, () => render(this.props));
    }
  };
}

// This is all it takes to define an efficient component with
// any number of data dependencies. Pretty neat!
const Thing = reactiveComponent(props => <div>{c()}</div>);
```

## Usage with Redux

A great use case for Grindelwald is to compute derived data from your Redux store. Derived data is then only recomputed when needed, preventing unnecessary rerenders of your React components.

```js
import {reactive} from 'grindelwald';
import {createStore} from 'redux';

// This is your Redux store.
const store = createStore(reducers);

// Create a reactive function that simply wraps Redux's getState().
const getState = reactive(() => store.getState());

// Make sure the function gets invalidated any time the store changes.
store.subscribe(() => getState.update());

// Create a reactive function for each slice of the store you care about,
// so any dependencies don't run when something unrelated changes.
const usersStore = reactive(() => getState().users);

// Compute data in the shape that your components need. You can pass in
// parameters, perform expensive calculations, or instantiate new objects
// without worrying about performance or breaking shouldComponentUpdate().
const userById = reactive(id => usersStore()[id], id => id);
```

Once you have reactive functions that return data in the shape you want it, you can subscribe to them in your React components, as shown in the previous section.

## API

### reactive(f: Function, argsToCacheKey?: Function): ReactiveFunction

Returns a reactive version of `f`. It behaves just like `f`, except its results are cached. `f` runs again only if any other reactive functions it calls have run and returned a new value.

If `f` takes any parameters, provide a second argument to `reactive` which combines the arguments into a cache key string, e.g.: ``(arg1, arg2) => `${arg1}-${arg2}` ``. `f` will memoize its results based on the cache key provided. It will run again any time it's passed arguments it has never seen before, or after being invalidated (e.g. by a dependency changing).

### ReactiveFunction.update()

Invalidates the cache for this reactive function. This is useful to trigger updates to any functions that are not "pure", i.e. they depend on data that is not returned by other reactive functions. Typically you'll have at least one such function in your system. Calling `update()` on it will invalidate all its dependencies.

### ReactiveFunction.subscribe(listener: Function)

Subscribes `listener` to a reactive function. `listener` will be called with the return value of the function any time the value changes.

### ReactiveFunction.unsubscribe(listener: Function)

Unsubscribes a function previously subscribed. Make sure you pass in the same function instance as you did to `subscribe`.

### autosubscribe(onUpdate: Function, f: Function)

Immediately runs `f`, and returns its return value. Also keeps track of any reactive functions `f` calls, and adds `onUpdate` as a subscriber to all of them. On subsequent calls, if the dependencies of `f` change, the subscriptions get updated. Therefore, calling `autosubscribe(() => {}, onUpdate)` unsubscribes `onUpdate` from everything.
