const called = {};
const stack = [];
const vide = Symbol('void');

class KeyNode {

  constructor(node, key) {
    this.update = () => {
      this.node.invalidate(this.key);
    };

    this.node = node;
    this.key = key;
  }

}

class Node {

  constructor(id, fn, keyFn) {
    this.toString = () => {
      return this.id;
    };

    this.isValid = key => {
      return this.lastResults[key] !== undefined;
    };

    this.invalidate = (key = vide) => {
      if (!this.hasListeners(key)) {
        delete this.lastResults[key];
        return;
      }

      called[this.id] = (called[this.id] || 0) + 1;
      const args = this.keyArgs[key];
      const res = this.fn(...args);
      if (res !== this.lastResults[key]) {
        this.lastResults[key] = res;
        [...this.listeners[key]].forEach(listener => listener(res));
      }
    };

    this.call = (...args) => {
      const key = this.keyFn(...args);
      if (stack[0] && newSubscriptions.get(stack[0])) {
        newSubscriptions.get(stack[0]).add(this.keyNode(key));
      }
      if (this.isValid(key)) {
        return this.lastResults[key];
      }
      called[this.id] = (called[this.id] || 0) + 1;
      this.keyArgs[key] = args;
      const res = autosubscribe(this.keyNode(key).update, () => {
        return this.fn(...args);
      });
      this.lastResults[key] = res;
      return res;
    };

    this.id = `reactive(${ id })`;
    this.fn = fn;
    this.keyFn = keyFn || (() => vide);
    this.keyNodes = {};
    this.keyArgs = {};
    this.lastResults = {};
    this.listeners = {};
  }

  subscribe(listener, key = vide) {
    this.listeners[key] || (this.listeners[key] = new Set());
    this.listeners[key].add(listener);
  }

  unsubscribe(listener, key = vide) {
    if (!this.listeners[key]) return;
    this.listeners[key].delete(listener);
  }

  hasListeners(key) {
    return this.listeners[key] && this.listeners[key].size;
  }

  keyNode(key) {
    if (this.keyNodes[key]) return this.keyNodes[key];
    this.keyNodes[key] = new KeyNode(this, key);
    return this.keyNodes[key];
  }

}

let nextID = 0;
function reactive(fn, keyFn) {
  const node = new Node(nextID++, fn, keyFn);
  node.call.toString = node.toString;
  node.call.node = node;
  node.call.invalidate = node.invalidate;
  return node.call;
}

const subscriptions = new Map();
const newSubscriptions = new Map();

function subtract(a, b) {
  return [...a].filter(x => !b.has(x));
}

function autosubscribe(listener, fn) {
  subscriptions.has(listener) || subscriptions.set(listener, new Set());
  newSubscriptions.has(listener) || newSubscriptions.set(listener, new Set());
  stack.unshift(listener);
  const res = fn();
  stack.shift();
  const newSubs = newSubscriptions.get(listener);
  const oldSubs = subscriptions.get(listener);
  const toSubscribe = subtract(newSubs, oldSubs);
  const toUnsubscribe = subtract(oldSubs, newSubs);
  toSubscribe.forEach(keyNode => keyNode.node.subscribe(listener, keyNode.key));
  toUnsubscribe.forEach(keyNode => keyNode.node.unsubscribe(listener, keyNode.key));
  subscriptions.set(listener, newSubs);
  newSubscriptions.delete(listener);
  return res;
}

export { reactive, autosubscribe };
