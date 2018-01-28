const vide = '__void__';

export type ReactiveFunction<Fn extends Function> = Fn & {
  toString: () => string;
  update(key?: string): void;
  subscribe(listener: () => void, key?: string): void;
  unsubscribe(listener: () => void, key?: string): void;
  _node: Grindelwald.Node<any, any, any, any, any, any, any>;
};

export namespace Grindelwald {
  export type Key = string;
  export type AnyKeyNode = KeyNode<any, any, any, any, any, any, any>;
  export type Listener = (() => void) | AnyKeyNode;

  export class KeyNode<A, B, C, D, E, F, R> {
    private node: Grindelwald.Node<A, B, C, D, E, F, R>;
    private key: Key;

    constructor(node: Node<A, B, C, D, E, F, R>, key: Key) {
      this.node = node;
      this.key = key;
    }

    update: {
      (): void;
      (batchListeners: true): Array<() => void>;
    } = (batchListeners = false): any => {
      if (batchListeners) {
        return this.node.update(this.key, batchListeners);
      } else {
        this.node.update(this.key);
      }
    };

    subscribe = (listener: Listener) => {
      this.node.subscribe(listener, this.key);
    };

    unsubscribe = (listener: Listener) => {
      this.node.unsubscribe(listener, this.key);
    };

    hasListeners = (): boolean => {
      return this.node.hasListeners(this.key);
    };
  }

  export class Node<A, B, C, D, E, F, R> {
    private id: string;
    private fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R;
    private keyFn: (a: A, b: B, c: C, d: D, e: E, f: F) => string;
    public listeners: {[key: string]: Set<Listener>};
    private keyNodes: {[key: string]: AnyKeyNode};
    private keyArgs: {[key: string]: [A, B, C, D, E, F]};
    public lastResults: {[key: string]: R};

    constructor(
      id: number,
      fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R,
      keyFn: (a: A, b: B, c: C, d: D, e: E, f: F) => string = () => vide,
    ) {
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
    };

    subscribe = (listener: Listener, key = vide) => {
      this.listeners[key] || (this.listeners[key] = new Set());
      this.listeners[key].add(listener);
    };

    unsubscribe = (listener: Listener, key = vide) => {
      if (!this.listeners[key]) return;
      this.listeners[key].delete(listener);
    };

    isValid = (key: Key) => {
      return this.lastResults[key] !== undefined;
    };

    hasDependencies(key: Key = vide) {
      return !!this.listeners[key] && this.listeners[key].size > 0;
    }

    hasListeners(key: Key = vide) {
      return (
        this.hasDependencies(key) &&
        Array.from(this.listeners[key]).some(
          listener => (listener instanceof KeyNode ? listener.hasListeners() : true),
        )
      );
    }

    update: {
      (key: Key): void;
      (key: Key, batchListeners: true): Array<() => void>;
    } = (key = vide, batchListeners = false): any => {
      const listenersToUpdate = new Set<() => void>();

      if (!this.hasListeners(key)) {
        delete this.lastResults[key];
        if (this.listeners[key]) {
          for (const listener of Array.from(this.listeners[key])) {
            if (listener instanceof KeyNode) {
              for (const l of listener.update(true)) {
                listenersToUpdate.add(l);
              }
            }
          }
        }
      } else {
        const res = autosubscribe(this.keyNode(key), () => this.fn.apply(null, this.keyArgs[key]));
        if (res !== this.lastResults[key]) {
          this.lastResults[key] = res;
          for (const listener of Array.from(this.listeners[key])) {
            if (listener instanceof KeyNode) {
              for (const l of listener.update(true)) {
                listenersToUpdate.add(l);
              }
            } else {
              listenersToUpdate.add(listener);
            }
          }
        }
      }

      if (batchListeners) {
        return Array.from(listenersToUpdate);
      } else {
        for (const listener of Array.from(listenersToUpdate)) listener();
      }
    };

    keyNode(key: Key): AnyKeyNode {
      if (this.keyNodes[key]) return this.keyNodes[key];
      this.keyNodes[key] = new KeyNode(this, key);
      return this.keyNodes[key];
    }

    call = (a: A, b: B, c: C, d: D, e: E, f: F): R => {
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
    };
  }
}

let nextID = 0;

export function reactive<R>(fn: () => R): ReactiveFunction<() => R>;
export function reactive<A, R>(
  fn: (a: A) => R,
  keyFn: (a: A) => string,
): ReactiveFunction<(a: A) => R>;
export function reactive<A, B, R>(
  fn: (a: A, b: B) => R,
  keyFn: (a: A, b: B) => string,
): ReactiveFunction<(a: A, b: B) => R>;
export function reactive<A, B, C, R>(
  fn: (a: A, b: B, c: C) => R,
  keyFn: (a: A, b: B, c: C) => string,
): ReactiveFunction<(a: A, b: B, c: C) => R>;
export function reactive<A, B, C, D, R>(
  fn: (a: A, b: B, c: C, d: D) => R,
  keyFn: (a: A, b: B, c: C, d: D) => string,
): ReactiveFunction<(a: A, b: B, c: C, d: D) => R>;
export function reactive<A, B, C, D, E, R>(
  fn: (a: A, b: B, c: C, d: D, e: E) => R,
  keyFn: (a: A, b: B, c: C, d: D, e: E) => string,
): ReactiveFunction<(a: A, b: B, c: C, d: D, e: E) => R>;
export function reactive<A, B, C, D, E, F, R>(
  fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R,
  keyFn: (a: A, b: B, c: C, d: D, e: E, f: F) => string,
): ReactiveFunction<(a: A, b: B, c: C, d: D, e: E, f: F) => R>;

export function reactive<A, B, C, D, E, F, R>(
  fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R,
  keyFn?: (a: A, b: B, c: C, d: D, e: E, f: F) => string,
): ReactiveFunction<(a: A, b: B, c: C, d: D, e: E, f: F) => R> {
  const node = new Grindelwald.Node(nextID++, fn, keyFn);
  const f = node.call as ReactiveFunction<(a: A, b: B, c: C, d: D, e: E, f: F) => R>;
  f.toString = node.toString;
  f.update = node.update;
  f.subscribe = node.subscribe;
  f.unsubscribe = node.unsubscribe;
  f._node = node;
  return f;
}

const stack: Set<Grindelwald.AnyKeyNode>[] = [];
const subscriptions: Map<Grindelwald.Listener, Set<Grindelwald.AnyKeyNode>> = new Map();
const newSubscriptions: Map<Grindelwald.Listener, Set<Grindelwald.AnyKeyNode>> = new Map();

function subtract<T>(a: Set<T>, b: Set<T>): T[] {
  return Array.from(a).filter(x => !b.has(x));
}

export function autosubscribe<T>(listener: Grindelwald.Listener, fn: () => T): T {
  subscriptions.has(listener) || subscriptions.set(listener, new Set());
  const newSubs: Set<Grindelwald.AnyKeyNode> = new Set();
  stack.unshift(newSubs);
  const res = fn();
  stack.shift();
  const oldSubs: Set<Grindelwald.AnyKeyNode> = subscriptions.get(listener) || new Set();
  const toSubscribe = subtract(newSubs, oldSubs);
  const toUnsubscribe = subtract(oldSubs, newSubs);
  toSubscribe.forEach(keyNode => keyNode.subscribe(listener));
  toUnsubscribe.forEach(keyNode => keyNode.unsubscribe(listener));
  subscriptions.set(listener, newSubs);
  newSubscriptions.delete(listener);
  return res;
}
