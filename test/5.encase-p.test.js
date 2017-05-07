import {expect} from 'chai';
import {Future, encaseP, encaseP2, encaseP3} from '../index.es.js';
import * as U from './util';
import type from 'sanctuary-type-identifiers';

const unaryNoop = a => Promise.resolve(a);
const binaryNoop = (a, b) => Promise.resolve(b);
const ternaryNoop = (a, b, c) => Promise.resolve(c);

describe('encaseP()', () => {

  it('is a curried binary function', () => {
    expect(encaseP).to.be.a('function');
    expect(encaseP.length).to.equal(2);
    expect(encaseP(U.noop)).to.be.a('function');
  });

  it('throws TypeError when not given a function', () => {
    const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
    const fs = xs.map(x => () => encaseP(x));
    fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
  });

  it('returns an instance of Future', () => {
    expect(encaseP(unaryNoop, null)).to.be.an.instanceof(Future);
  });

});

describe('encaseP2()', () => {

  it('is a curried ternary function', () => {
    expect(encaseP2).to.be.a('function');
    expect(encaseP2.length).to.equal(3);
    expect(encaseP2((a, b) => b)).to.be.a('function');
    expect(encaseP2((a, b) => b)(1)).to.be.a('function');
    expect(encaseP2((a, b) => b, 1)).to.be.a('function');
  });

  it('throws TypeError when not given a function', () => {
    const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
    const fs = xs.map(x => () => encaseP2(x));
    fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
  });

  it('returns an instance of Future', () => {
    expect(encaseP2(binaryNoop, null, null)).to.be.an.instanceof(Future);
  });

});

describe('encaseP3()', () => {

  it('is a curried quaternary function', () => {
    expect(encaseP3).to.be.a('function');
    expect(encaseP3.length).to.equal(4);
    expect(encaseP3((a, b, c) => c)).to.be.a('function');
    expect(encaseP3((a, b, c) => c)(1)).to.be.a('function');
    expect(encaseP3((a, b, c) => c, 1)).to.be.a('function');
    expect(encaseP3((a, b, c) => c)(1)(2)).to.be.a('function');
    expect(encaseP3((a, b, c) => c, 1)(2)).to.be.a('function');
    expect(encaseP3((a, b, c) => c)(1, 2)).to.be.a('function');
    expect(encaseP3((a, b, c) => c, 1, 2)).to.be.a('function');
  });

  it('throws TypeError when not given a function', () => {
    const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
    const fs = xs.map(x => () => encaseP3(x));
    fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
  });

  it('returns an instance of Future', () => {
    expect(encaseP3(ternaryNoop, null, null, null))
    .to.be.an.instanceof(Future);
  });

});

describe('FromPromise', () => {

  it('extends Future', () => {
    expect(encaseP(U.noop, 1)).to.be.an.instanceof(Future);
  });

  it('is considered a member of fluture/Fluture', () => {
    expect(type(encaseP(U.noop, 1))).to.equal(Future['@@type']);
  });

  describe('#fork()', () => {

    describe('(unary)', () => {

      it('throws TypeError when the function does not return a Promise', () => {
        const f = () => encaseP(U.noop, 1).fork(U.noop, U.noop);
        expect(f).to.throw(TypeError, /Future.*Promise/);
      });

      it('resolves with the resolution value of the returned Promise', () => {
        const actual = encaseP(x => Promise.resolve(x + 1), 1);
        return U.assertResolved(actual, 2);
      });

      it('rejects with rejection reason of the returned Promise', () => {
        const actual = encaseP(_ => Promise.reject(U.error), 1);
        return U.assertRejected(actual, U.error);
      });

    });

    describe('(binary)', () => {

      it('throws TypeError when the function does not return a Promise', () => {
        const f = () => encaseP2(U.noop, 1, 1).fork(U.noop, U.noop);
        expect(f).to.throw(TypeError, /Future.*Promise/);
      });

      it('resolves with the resolution value of the returned Promise', () => {
        const actual = encaseP2((x, y) => Promise.resolve(y + 1), 1, 1);
        return U.assertResolved(actual, 2);
      });

      it('rejects with rejection reason of the returned Promise', () => {
        const actual = encaseP2(_ => Promise.reject(U.error), 1, 1);
        return U.assertRejected(actual, U.error);
      });

    });

    describe('(ternary)', () => {

      it('throws TypeError when the function does not return a Promise', () => {
        const f = () => encaseP3(U.noop, 1, 1, 1).fork(U.noop, U.noop);
        expect(f).to.throw(TypeError, /Future.*Promise/);
      });

      it('resolves with the resolution value of the returned Promise', () => {
        const actual = encaseP3((x, y, z) => Promise.resolve(z + 1), 1, 1, 1);
        return U.assertResolved(actual, 2);
      });

      it('rejects with rejection reason of the returned Promise', () => {
        const actual = encaseP3(_ => Promise.reject(U.error), 1, 1, 1);
        return U.assertRejected(actual, U.error);
      });

    });

  });

  describe('#toString()', () => {

    it('returns the code to create the FromPromise', () => {
      const m1 = encaseP(unaryNoop, null);
      const m2 = encaseP2(binaryNoop, null, null);
      const m3 = encaseP3(ternaryNoop, null, null, null);
      expect(m1.toString()).to.equal(
        `Future.encaseP(${unaryNoop.toString()}, null)`
      );
      expect(m2.toString()).to.equal(
        `Future.encaseP2(${binaryNoop.toString()}, null, null)`
      );
      expect(m3.toString()).to.equal(
        `Future.encaseP3(${ternaryNoop.toString()}, null, null, null)`
      );
    });

  });

});
