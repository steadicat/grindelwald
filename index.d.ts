export declare type ReactiveFunction<Fn extends Function> = Fn & {
    toString: () => string;
    update(key?: string): void;
    subscribe(listener: () => void, key?: string): void;
    unsubscribe(listener: () => void, key?: string): void;
    _node: Grindelwald.Node<any, any, any, any, any, any, any>;
};
export declare namespace Grindelwald {
    type Key = string;
    type AnyKeyNode = KeyNode<any, any, any, any, any, any, any>;
    type Listener = (() => void) | AnyKeyNode;
    class KeyNode<A, B, C, D, E, F, R> {
        private node;
        private key;
        constructor(node: Node<A, B, C, D, E, F, R>, key: Key);
        update: {
            (): void;
            (batchListeners: true): Array<() => void>;
        };
        subscribe: (listener: Listener) => void;
        unsubscribe: (listener: Listener) => void;
        hasListeners: () => boolean;
    }
    class Node<A, B, C, D, E, F, R> {
        private id;
        private fn;
        private keyFn;
        listeners: {
            [key: string]: Set<Listener>;
        };
        private keyNodes;
        private keyArgs;
        lastResults: {
            [key: string]: R;
        };
        constructor(id: number, fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R, keyFn?: (a: A, b: B, c: C, d: D, e: E, f: F) => string);
        toString: () => string;
        subscribe: (listener: Listener, key?: string) => void;
        unsubscribe: (listener: Listener, key?: string) => void;
        isValid: (key: string) => boolean;
        hasDependencies(key?: Key): boolean;
        hasListeners(key?: Key): boolean;
        update: {
            (key: Key): void;
            (key: Key, batchListeners: true): Array<() => void>;
        };
        keyNode(key: Key): AnyKeyNode;
        call: (a: A, b: B, c: C, d: D, e: E, f: F) => R;
    }
}
export declare function reactive<R>(fn: () => R): ReactiveFunction<() => R>;
export declare function reactive<A, R>(fn: (a: A) => R, keyFn: (a: A) => string): ReactiveFunction<(a: A) => R>;
export declare function reactive<A, B, R>(fn: (a: A, b: B) => R, keyFn: (a: A, b: B) => string): ReactiveFunction<(a: A, b: B) => R>;
export declare function reactive<A, B, C, R>(fn: (a: A, b: B, c: C) => R, keyFn: (a: A, b: B, c: C) => string): ReactiveFunction<(a: A, b: B, c: C) => R>;
export declare function reactive<A, B, C, D, R>(fn: (a: A, b: B, c: C, d: D) => R, keyFn: (a: A, b: B, c: C, d: D) => string): ReactiveFunction<(a: A, b: B, c: C, d: D) => R>;
export declare function reactive<A, B, C, D, E, R>(fn: (a: A, b: B, c: C, d: D, e: E) => R, keyFn: (a: A, b: B, c: C, d: D, e: E) => string): ReactiveFunction<(a: A, b: B, c: C, d: D, e: E) => R>;
export declare function reactive<A, B, C, D, E, F, R>(fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R, keyFn: (a: A, b: B, c: C, d: D, e: E, f: F) => string): ReactiveFunction<(a: A, b: B, c: C, d: D, e: E, f: F) => R>;
export declare function autosubscribe<T>(listener: Grindelwald.Listener, fn: () => T): T;
