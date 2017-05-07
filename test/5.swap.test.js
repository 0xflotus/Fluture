import {expect} from 'chai';
import {Future, swap, of, reject} from '../index.es.js';
import * as U from './util';
import type from 'sanctuary-type-identifiers';

const testInstance = swap => {

  it('is considered a member of fluture/Fluture', () => {
    expect(type(swap(of(1)))).to.equal(Future['@@type']);
  });

  describe('#fork()', () => {

    it('rejects with the resolution value', () => {
      const actual = swap(of(1));
      return U.assertRejected(actual, 1);
    });

    it('resolves with the rejection reason', () => {
      const actual = swap(reject(1));
      return U.assertResolved(actual, 1);
    });

  });

};

describe('swap()', () => {

  it('throws when not given a Future', () => {
    const f = () => swap(1);
    expect(f).to.throw(TypeError, /Future/);
  });

  testInstance(m => swap(m));

});

describe('Future#swap()', () => {

  it('throws when invoked out of context', () => {
    const f = () => of(1).swap.call(null);
    expect(f).to.throw(TypeError, /Future/);
  });

  it('swaps Computation', () => {
    const m = Future(rej => rej(1));
    return U.assertResolved(m.swap(), 1);
  });

  testInstance(m => m.swap());

});
