import {reactive as r, autosubscribe, ReactiveFunction} from '../src/index';
import {expect} from 'chai';
import * as sinon from 'sinon';

function reactive<Fn extends Function>(
  fn: Fn,
  ...args: any[]
): ReactiveFunction<Fn> & {spy: sinon.SinonSpy} {
  const spy = sinon.spy();
  const res = (r((...args: any[]) => {
    spy();
    return (fn as any)(...args);
  }, ...args) as any) as ReactiveFunction<Fn> & {spy: sinon.SinonSpy};
  res.spy = spy;
  return res;
}

let start = 2;

const a = reactive(() => start);
const b = reactive(() => a() * 2);
const c = reactive(() => b() > 10);
const d = reactive(() => (c() ? 40 : 20));
const e = reactive(() => (c() ? 20 : 40));
const f = reactive((x: number) => e() * x, (x: number) => x);

type AnyReactiveFunctionWithSpy = ReactiveFunction<any> & {
  spy: sinon.SinonSpy;
};

function expectCalls(fns: Array<AnyReactiveFunctionWithSpy | sinon.SinonSpy>, counts: number[]) {
  const spies = fns.map(f => {
    if ('spy' in f) {
      return (f as AnyReactiveFunctionWithSpy).spy;
    } else {
      return f as sinon.SinonSpy;
    }
  });
  expect(spies.map(spy => spy.callCount)).to.deep.equal(counts);
  for (const spy of spies) {
    spy.resetHistory();
  }
}

describe('Grindelwald', () => {
  it('memoizes simple chains', () => {
    expect(d()).to.equal(20);
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 1, 0, 0]);

    expect(d()).to.equal(20);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(e()).to.equal(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 1, 0]);

    expect(e()).to.equal(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);
  });

  it('sets up the chain of dependencies', () => {
    expect(a._node.hasDependencies()).to.be.true;
    expect(b._node.hasDependencies()).to.be.true;
    expect(c._node.hasDependencies()).to.be.true;
    expect(d._node.hasDependencies()).to.be.false;
    expect(e._node.hasDependencies()).to.be.false;
  });

  it('supports parameters', () => {
    expect(f(2)).to.equal(80);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);

    expect(f(2)).to.equal(80);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(f(4)).to.equal(160);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);
  });

  it('is lazy when invalidating', () => {
    start = 6;
    expect(a._node.hasListeners()).to.be.false;

    a.update();
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);
  });

  it('recomputes on the fly', () => {
    expect(a()).to.equal(6);
    expectCalls([a, b, c, d, e, f], [1, 0, 0, 0, 0, 0]);

    expect(b()).to.equal(12);
    expectCalls([a, b, c, d, e, f], [0, 1, 0, 0, 0, 0]);

    expect(c()).to.equal(true);
    expectCalls([a, b, c, d, e, f], [0, 0, 1, 0, 0, 0]);

    expect(e()).to.equal(20);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 1, 0]);

    expect(f(2)).to.equal(40);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);

    expect(f(3)).to.equal(60);
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 1]);
  });

  it('does not recompute if values don’t change', () => {
    start = 12;

    a.update();
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(d()).to.equal(40);
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 1, 0, 0]);

    expect(d()).to.equal(40);
    expect(d()).to.equal(40);
    expect(e()).to.equal(20);
    expect(e()).to.equal(20);
    expect(e()).to.equal(20);
    expect(f(2)).to.equal(40);
    expect(f(2)).to.equal(40);
    expect(f(2)).to.equal(40);
    expect(f(3)).to.equal(60);
    expect(f(3)).to.equal(60);
    expect(f(3)).to.equal(60);

    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 1, 2]); // TODO
  });

  it('supports subscriptions', () => {
    const s = sinon.spy();
    f.subscribe(s, '2');
    expectCalls([a, b, c, d, e, f], [0, 0, 0, 0, 0, 0]);

    expect(f._node.hasListeners('2')).to.equal(true, 'f(2) should have listeners');
    expect(e._node.hasListeners()).to.equal(true, 'e should have listeners');
    expect(c._node.hasListeners()).to.equal(true, 'c should have listeners');
    expect(b._node.hasListeners()).to.equal(true, 'b should have listeners');
    expect(a._node.hasListeners()).to.equal(true, 'a should have listeners');

    start = 10;
    a.update();
    expect(s.callCount).to.equal(0, 'subscriber should not be called if value did’t change');
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 0, 0, 0]);

    start = 0;
    a.update();
    expect(s.callCount).to.equal(1, 'subscriber should be called if value changed');
    expectCalls([a, b, c, d, e, f], [1, 1, 1, 0, 1, 1]);
  });

  it('supports auto-subscribe', () => {
    const update = sinon.spy();
    const inner = sinon.spy();
    autosubscribe(update, () => {
      inner();
      return a();
    });
    expectCalls([inner, update], [1, 0]);

    a.update();
    expectCalls([inner, update], [0, 0]);

    start = 123;
    a.update();
    expectCalls([inner, update], [0, 1]);
  });

  it('supports auto-unsubscribe', () => {
    const update = sinon.spy();
    const inner = sinon.spy();

    let callsA = true;

    function onUpdate() {
      update();
      myF();
    }

    const myF = autosubscribe.bind(null, onUpdate, () => {
      inner();
      return callsA ? a() : null;
    });

    myF();
    expectCalls([inner, update], [1, 0]);

    callsA = false;

    start = 345;
    a.update();
    expectCalls([inner, update], [1, 1]);

    // We should be unsubscribed now

    start = 456;
    a.update();
    expectCalls([inner, update], [0, 0]);
  });

  it('supports changing the subscribed keys', () => {
    let n = 0;

    const a = reactive((key: string) => key, (key: string) => key);
    const b = reactive(() => a(['foo', 'bar', 'baz'][n]));
    b.subscribe(() => null);

    expect(b()).to.equal('foo');
    expect(a._node.listeners.foo.size).to.equal(1);
    expect(a._node.listeners.bar).to.equal(undefined);
    expect(a._node.listeners.baz).to.equal(undefined);
    expectCalls([a, b], [1, 1]);

    n = 1;
    b.update();
    expect(a._node.listeners.foo.size).to.equal(0);
    expect(a._node.listeners.bar.size).to.equal(1);
    expect(a._node.listeners.baz).to.equal(undefined);
    expectCalls([a, b], [1, 1]);
    expect(b._node.lastResults['__void__']).to.equal('bar');
    expect(b()).to.equal('bar');

    n = 2;
    b.update();
    expect(b()).to.equal('baz');
  });

  it('batches updates', () => {
    const update = sinon.spy();

    a.subscribe(update);
    b.subscribe(update);
    d.subscribe(update);
    expect(update.callCount).to.equal(0);

    start = 0;
    a.update();
    expect(update.callCount).to.equal(1);
  });
});
