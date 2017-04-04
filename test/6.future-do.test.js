import {expect} from 'chai';
import Future from '..';
import U from './util';

describe('Future.do()', () => {

  it('throws TypeError when not given a function', () => {
    const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
    const fs = xs.map(x => () => Future.do(x));
    fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
  });

});

describe('FutureDo', () => {

  describe('#fork()', () => {

    it('throws TypeError when the given function does not return an interator', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null, () => {}, {next: 'hello'}];
      const fs = xs.map(x => () => Future.do(() => x).fork(U.noop, U.noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws TypeError when the returned iterator does not return a valid iteration', () => {
      const xs = [null, '', {}, {value: 1, done: 1}];
      const fs = xs.map(x => () => Future.do(() => ({next: () => x})).fork(U.noop, U.noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws TypeError when the returned iterator produces something other than a Future', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () =>
        Future.do(() => ({next: () => ({done: false, value: x})})).fork(U.noop, U.noop)
      );
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('can be used to chain Futures in do-notation', () => {
      const actual = Future.do(function*(){
        const a = yield Future.of(1);
        const b = yield Future.of(2);
        return a + b;
      });
      return Promise.all([
        U.assertResolved(actual, 3),
        U.assertResolved(actual, 3)
      ]);
    });

    it('is stack safe', () => {
      const gen = function*(){
        let i = 0;
        while(i < U.STACKSIZE + 1) yield Future.of(i++);
        return i;
      };
      const m = Future.do(gen);
      return U.assertResolved(m, U.STACKSIZE + 1);
    });

  });

  describe('#toString()', () => {

    it('returns the code to create the FutureDo', () => {
      const m = Future.do(function*(){});
      const s = 'Future.do(function* () {})';
      expect(m.toString()).to.equal(s);
    });

  });

});
