import {expect} from 'chai';
import {Future, both, of} from '../index.es.js';
import * as U from './util';
import * as F from './futures';
import type from 'sanctuary-type-identifiers';

const testInstance = both => {

  it('is considered a member of fluture/Fluture', () => {
    expect(type(both(F.resolved, F.resolvedSlow))).to.equal(Future['@@type']);
  });

  describe('#fork()', () => {

    describe('(res, res)', () => {

      it('resolves with both if left resolves first', () => {
        return U.assertResolved(both(F.resolved, F.resolvedSlow), ['resolved', 'resolvedSlow']);
      });

      it('resolves with both if left resolves last', () => {
        return U.assertResolved(both(F.resolvedSlow, F.resolved), ['resolvedSlow', 'resolved']);
      });

    });

    describe('(rej, rej)', () => {

      it('rejects with right if right rejects first', () => {
        return U.assertRejected(both(F.rejectedSlow, F.rejected), 'rejected');
      });

      it('rejects with left if right rejects last', () => {
        return U.assertRejected(both(F.rejected, F.rejectedSlow), 'rejected');
      });

    });

    describe('(rej, res)', () => {

      it('rejects with left if right resolves first', () => {
        return U.assertRejected(both(F.rejectedSlow, F.resolved), 'rejectedSlow');
      });

      it('rejects with left if right resolves last', () => {
        return U.assertRejected(both(F.rejected, F.resolvedSlow), 'rejected');
      });

    });

    describe('(res, rej)', () => {

      it('rejects with right if left resolves first', () => {
        return U.assertRejected(both(F.resolved, F.rejectedSlow), 'rejectedSlow');
      });

      it('rejects with right if left resolves last', () => {
        return U.assertRejected(both(F.resolvedSlow, F.rejected), 'rejected');
      });

    });

    it('creates a cancel function which cancels both Futures', done => {
      let cancelled = false;
      const m = Future(() => () => (cancelled ? done() : (cancelled = true)));
      const cancel = both(m, m).fork(U.noop, U.noop);
      cancel();
    });

  });

};

describe('both()', () => {

  it('is a curried binary function', () => {
    expect(both).to.be.a('function');
    expect(both.length).to.equal(2);
    expect(both(of(1))).to.be.a('function');
  });

  it('throws when not given a Future as first argument', () => {
    const f = () => both(1);
    expect(f).to.throw(TypeError, /Future.*first/);
  });

  it('throws when not given a Future as second argument', () => {
    const f = () => both(of(1), 1);
    expect(f).to.throw(TypeError, /Future.*second/);
  });

  testInstance((a, b) => both(a, b));

});

describe('Future#both()', () => {

  it('throws when invoked out of context', () => {
    const f = () => of(1).both.call(null, of(1));
    expect(f).to.throw(TypeError, /Future/);
  });

  it('throws TypeError when not given a Future', () => {
    const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null, x => x];
    const fs = xs.map(x => () => of(1).both(x));
    fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
  });

  testInstance((a, b) => a.both(b));

});
