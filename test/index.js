import {reactive as r} from '../src/index';
import expect from 'expect';

function reactive(f, ...args) {
  const spy = expect.createSpy();
  const res = r((...a) => {
    spy();
    return f(...a);
  }, ...args);
  res.spy = spy;
  return res;
}

let start = 2;

const a = reactive(() => start);
const b = reactive(() => a() * 2);
const c = reactive(() => b() > 10);
const d = reactive(() => c() ? 40 : 20);
const e = reactive(() => c() ? 20 : 40);
const f = reactive(x => e() * x, x => x);

function expectCalls(fs, counts) {
  fs.forEach((f, i) => {
    expect(f.spy.calls.length).toBe(counts[i], `${i} called ${f.spy.calls.length} times, should have been ${counts[i]}`);
    f.spy.reset();
  });
}

describe('Grindelwald', () => {

  it('should memoize simple chains', () => {
    expect(d()).toBe(20);
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 1, 0, 0]);

    expect(d()).toBe(20);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(e()).toBe(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 1, 0]);

    expect(e()).toBe(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);
  });

  it('should support parameters', () => {
    expect(f(2)).toBe(80);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]); // TODO

    expect(f(2)).toBe(80);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(f(4)).toBe(160);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]); // TODO
  });

  it('should support updates', () => {
    start = 6;
    a.invalidate();
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 0, 1, 0]); // TODO

    expect(a()).toBe(6);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(b()).toBe(12);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(c()).toBe(true);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(e()).toBe(20);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]); // TODO

    expect(f(2)).toBe(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);

    expect(f(3)).toBe(60);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);
  });

  it('should not recompute if values don’t change', () => {
    start = 12;

    a.invalidate();
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 0, 0, 0]); // TODO

    expect(d()).toBe(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 1, 0, 0]); // TODO

    expect(d()).toBe(40);
    expect(d()).toBe(40);
    expect(e()).toBe(20);
    expect(e()).toBe(20);
    expect(e()).toBe(20);
    expect(f(2)).toBe(40);
    expect(f(2)).toBe(40);
    expect(f(2)).toBe(40);
    expect(f(3)).toBe(60);
    expect(f(3)).toBe(60);
    expect(f(3)).toBe(60);

    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);
  });

  xit('should call listeners', () => {
  });

  xit('should auto-subscribe', () => {
  });

  xit('should auto-unsubscribe', () => {
  });

});

