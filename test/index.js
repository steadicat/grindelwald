import {reactive as r} from '../src/index';
import expect from 'expect';
/* global describe, it, xit */

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

  it('memoizes simple chains', () => {
    expect(d()).toBe(20);
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 1, 0, 0]);

    expect(d()).toBe(20);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(e()).toBe(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 1, 0]);

    expect(e()).toBe(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);
  });

  it('sets up the chain of dependencies', () => {
    expect(a.node.hasDependencies()).toBe(true);
    expect(b.node.hasDependencies()).toBe(true);
    expect(c.node.hasDependencies()).toBe(true);
    expect(d.node.hasDependencies()).toBe(false);
    expect(e.node.hasDependencies()).toBe(false);
  });

  it('supports parameters', () => {
    expect(f(2)).toBe(80);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);

    expect(f(2)).toBe(80);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(f(4)).toBe(160);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);
  });

  it('is lazy when invalidating', () => {
    start = 6;
    expect(a.node.hasListeners()).toBe(false);

    a.update();
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);
  });

  it('recomputes on the fly', () => {
    expect(a()).toBe(6);
    expectCalls([a, b, c, d, e, f], [1, 0, 0, 0, 0, 0]);

    expect(b()).toBe(12);
    expectCalls([a, b, c, d, e, f], [0, 1, 0, 0, 0, 0]);

    expect(c()).toBe(true);
    expectCalls([a, b, c, d, e, f], [0, 0, 1, 0, 0, 0]);

    expect(e()).toBe(20);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 1, 0]);

    expect(f(2)).toBe(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);

    expect(f(3)).toBe(60);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);
  });

  it('does not recompute if values don’t change', () => {
    start = 12;

    a.update();
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(d()).toBe(40);
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 1, 0, 0]);

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

    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 1, 2]); // TODO
  });

  it('supports subscriptions', () => {
    const s = expect.createSpy();
    f.subscribe(s, 2);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(f.node.hasListeners(2)).toBe(true, 'f(2) should have listeners');
    expect(e.node.hasListeners()).toBe(true, 'e should have listeners');
    expect(c.node.hasListeners()).toBe(true, 'c should have listeners');
    expect(b.node.hasListeners()).toBe(true, 'b should have listeners');
    expect(a.node.hasListeners()).toBe(true, 'a should have listeners');

    start = 10;
    a.update();
    expect(s.calls.length).toBe(0, 'subscriber should not be called if value did’t change');
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 0, 0, 0]);

    start = 0;
    a.update();
    expect(s.calls.length).toBe(1, 'subscriber should be called if value changed');
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 0, 1, 1]);

  });

  xit('supports auto-subscribe', () => {
  });

  xit('supports auto-unsubscribe', () => {
  });

});

