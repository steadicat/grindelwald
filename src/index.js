// @flow

const vide = '__void__';

class KeyNode {
  node: Node;
  key: Key;

  constructor(node, key) {
    this.node = node;
    this.key = key;
  }

  update = () => {
    this.node.invalidate(this.key);
  }

  subscribe = listener => {
    this.node.subscribe(listener, this.key);
  }

  unsubscribe = listener => {
    this.node.unsubscribe(listener, this.key);
  }

  invalidate = () => {
    this.node.invalidate(this.key);
  }

  hasListeners = () => {
    return this.node.hasListeners(this.key);
  }
}

type Key = string | Symbol;
type Listener = (() => void) | KeyNode;

class Node {
  id: string;
  fn: Function;
  keyFn: (any[] => Key);
  listeners: {[key: Key]: Set<Listener>};
  keyNodes: {[key: Key]: KeyNode};
  keyArgs: {[key: Key]: any[]};
  lastResults: {[key: Key]: any};

  constructor(id, fn, keyFn) {
    this.id = `reactive(${id})`;
    this.fn = fn;
    this.keyFn = keyFn || (() => vide);
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

  unsubscribe = (listener, key = vide) => {
    if (!this.listeners[key]) return;
    this.listeners[key].delete(listener);
  }

  isValid = key => {
    return this.lastResults[key] !== undefined;
  }

  hasDependencies(key = vide) {
    return !!this.listeners[key] && this.listeners[key].size > 0;
  }

  hasListeners(key = vide) {
    return this.hasDependencies(key) &&
      Array.from(this.listeners[key]).some(listener =>
        listener instanceof KeyNode ? listener.hasListeners() : true
      );
  }

  invalidate = (key = vide) => {
    if (!this.hasListeners(key)) {
      delete this.lastResults[key];
      this.listeners[key] && Array.from(this.listeners[key]).forEach(listener =>
        listener instanceof KeyNode ? listener.invalidate() : true);
      return;
    }

    const args = this.keyArgs[key];
    const res = this.fn(...args);
    if (res !== this.lastResults[key]) {
      this.lastResults[key] = res;
      Array.from(this.listeners[key]).forEach(listener =>
        listener instanceof KeyNode ? listener.update(res) : listener(res));
    }
  }

  keyNode(key) {
    if (this.keyNodes[key]) return this.keyNodes[key];
    this.keyNodes[key] = new KeyNode(this, key);
    return this.keyNodes[key];
  }

  call = (...args: any[]) => {
    const key = this.keyFn(...args);
    if (stack[0]) {
      stack[0].add(this.keyNode(key));
    }
    if (this.isValid(key)) {
      return this.lastResults[key];
    }

    this.keyArgs[key] = args;
    const res = autosubscribe(this.keyNode(key), () => {
      return this.fn(...args);
    });
    this.lastResults[key] = res;
    return res;
  }
}

let nextID = 0;
export function reactive(fn: Function, keyFn: ?(any[] => Key)) {
  const node = new Node(nextID++, fn, keyFn);
  node.call.toString = node.toString;
  node.call.node = node;
  node.call.invalidate = node.invalidate;
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
