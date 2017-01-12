// @flow

const vide = '__void__';

type Key = string | typeof vide;
type Listener = (() => void) | KeyNode;
type Fn<A, B, C, D, E, F, R> = (a?: A, b?: B, c?: C, d?: D, e?: E, f?: F) => R;
type KeyFn<A, B, C, D, E, F> = (a?: A, b?: B, c?: C, d?: D, e?: E, f?: F) => Key;

type ReactiveFunction<A, B, C, D, E, F, R> = Fn<A, B, C, D, E, F, R> & {
  node: Node<A, B, C, D, E, F, R>,
  +toString: () => string,
  update(key?: Key): void,
  subscribe(listener: Listener, key?: Key): void,
  unsubscribe(listener: Listener, key?: Key): void,
};

class KeyNode {
  node: Node<*, *, *, *, *, *, *>;
  key: Key;

  constructor(node: Node<*, *, *, *, *, *, *>, key: Key) {
    this.node = node;
    this.key = key;
  }

  update = () => {
    this.node.update(this.key);
  }

  subscribe = (listener: Listener) => {
    this.node.subscribe(listener, this.key);
  }

  unsubscribe = (listener: Listener) => {
    this.node.unsubscribe(listener, this.key);
  }

  hasListeners = (): boolean => {
    return this.node.hasListeners(this.key);
  }
}

class Node<A, B, C, D, E, F, R> {
  id: string;
  fn: Fn<A, B, C, D, E, F, R>;
  keyFn: KeyFn<A, B, C, D, E, F>;
  listeners: {[key: Key]: Set<Listener>};
  keyNodes: {[key: Key]: KeyNode};
  keyArgs: {[key: Key]: [?A, ?B, ?C, ?D, ?E, ?F]};
  lastResults: {[key: Key]: R};

  constructor(id: number, fn: Fn<A, B, C, D, E, F, R>, keyFn: KeyFn<A, B, C, D, E, F> = (() => vide)) {
    this.id = `reactive(${id})`;
    this.fn = fn;
    this.keyFn = keyFn;
    this.keyNodes = {};
    this.keyArgs = {};
    this.lastResults = {};
    this.listeners = {};
  }

  toString = () => {
    return this.id;
  }

  subscribe = (listener: Listener, key = vide) => {
    this.listeners[key] || (this.listeners[key] = new Set());
    this.listeners[key].add(listener);
  }

  unsubscribe = (listener: Listener, key = vide) => {
    if (!this.listeners[key]) return;
    this.listeners[key].delete(listener);
  }

  isValid = (key: Key) => {
    return this.lastResults[key] !== undefined;
  }

  hasDependencies(key: Key = vide) {
    return !!this.listeners[key] && this.listeners[key].size > 0;
  }

  hasListeners(key: Key = vide) {
    return this.hasDependencies(key) &&
      Array.from(this.listeners[key]).some(listener =>
        listener instanceof KeyNode ? listener.hasListeners() : true
      );
  }

  update = (key: Key = vide) => {
    if (!this.hasListeners(key)) {
      delete this.lastResults[key];
      this.listeners[key] && Array.from(this.listeners[key]).forEach(listener =>
        listener instanceof KeyNode ? listener.update() : true);
      return;
    }

    const res = autosubscribe(this.keyNode(key), () => this.fn.apply(null, this.keyArgs[key]));
    if (res !== this.lastResults[key]) {
      this.lastResults[key] = res;
      Array.from(this.listeners[key]).forEach(listener =>
        listener instanceof KeyNode ? listener.update(res) : listener(res));
    }
  }

  keyNode(key: Key): KeyNode {
    if (this.keyNodes[key]) return this.keyNodes[key];
    this.keyNodes[key] = new KeyNode(this, key);
    return this.keyNodes[key];
  }

  call = (a?: A, b?: B, c?: C, d?: D, e?: E, f?: F): R => {
    const key = this.keyFn(a, b, c, d, e, f);
    if (stack[0]) {
      stack[0].add(this.keyNode(key));
    }
    if (this.isValid(key)) {
      return this.lastResults[key];
    }

    this.keyArgs[key] = [a, b, c, d, e, f];
    const res = autosubscribe(this.keyNode(key), () => this.fn(a, b, c, d, e, f));
    this.lastResults[key] = res;
    return res;
  }
}

let nextID = 0;
export function reactive<A, B, C, D, E, F, R>(
  fn: Fn<A, B, C, D, E, F, R>,
  keyFn?: KeyFn<A, B, C, D, E, F>,
): ReactiveFunction<A, B, C, D, E, F, R> {
  const node = new Node(nextID++, fn, keyFn);
  node.call.toString = node.toString;
  node.call.node = node;
  node.call.update = node.update;
  node.call.subscribe = node.subscribe;
  node.call.unsubscribe = node.unsubscribe;
  return node.call;
}

const stack: Set<KeyNode>[] = [];
const subscriptions: Map<Listener, Set<KeyNode>> = new Map();
const newSubscriptions: Map<Listener, Set<KeyNode>> = new Map();

function subtract<T>(a: Set<T>, b: Set<T>): T[] {
  return Array.from(a).filter(x => !b.has(x));
}

export function autosubscribe<T>(listener: Listener, fn: () => T): T {
  subscriptions.has(listener) || subscriptions.set(listener, new Set());
  const newSubs: Set<KeyNode> = new Set();
  stack.unshift(newSubs);
  const res = fn();
  stack.shift();
  const oldSubs: Set<KeyNode> = subscriptions.get(listener) || new Set();
  const toSubscribe = subtract(newSubs, oldSubs);
  const toUnsubscribe = subtract(oldSubs, newSubs);
  toSubscribe.forEach(keyNode => keyNode.subscribe(listener));
  toUnsubscribe.forEach(keyNode => keyNode.unsubscribe(listener));
  subscriptions.set(listener, newSubs);
  newSubscriptions.delete(listener);
  return res;
}
