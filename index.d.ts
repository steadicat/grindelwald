type Key = string;
type Listener = (() => void);
type Fn<A, B, C, D, E, F, R> = (a?: A, b?: B, c?: C, d?: D, e?: E, f?: F) => R;
type KeyFn<A, B, C, D, E, F> = (a?: A, b?: B, c?: C, d?: D, e?: E, f?: F) => Key;

type ReactiveFunction<A, B, C, D, E, F, R> = Fn<A, B, C, D, E, F, R> & {
  update(key?: Key): void,
  subscribe(listener: Listener, key?: Key): void,
  unsubscribe(listener: Listener, key?: Key): void,
};

export declare function reactive<A, B, C, D, E, F, R>(
  fn: (a: A, b: B, c: C, d: D, e: E, f: F) => R,
  keyFn?: (a: A, b: B, c: C, d: D, e: E, f: F) => Key
): ReactiveFunction<A, B, C, D, E, F, R>;

export declare function autosubscribe<T>(listener: Listener, fn: () => T): T;
