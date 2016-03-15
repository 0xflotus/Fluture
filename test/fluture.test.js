'use strict';

const expect = require('chai').expect;
const Future = require('../fluture');

const noop = () => {};
const identity = x => x;
const compose = f => g => x => f(g(x));
const add = a => b => a + b;
const mult = a => b => a * b;
const error = new Error('It broke');

const repeat = (n, x) => {
  const out = new Array(n);
  while(n-- > 0){
    out[n] = x;
  }
  return out;
};

const failRes = x => {
  throw new Error(`Invalidly entered resolution branch with value ${x}`);
};

const failRej = x => {
  throw new Error(`Invalidly entered rejection branch with value ${x}`);
};

const assertIsFuture = x => expect(x).to.be.an.instanceof(Future);

const assertEqual = (a, b) => new Promise(done => {
  assertIsFuture(a);
  assertIsFuture(b);
  a.fork(failRej, a => b.fork(failRej, b => (expect(a).to.deep.equal(b), done())));
});

const assertResolved = (m, x) => new Promise(done => {
  assertIsFuture(m);
  m.fork(failRej, y => (expect(y).to.deep.equal(x), done()));
});

const assertRejected = (m, x) => new Promise(done => {
  assertIsFuture(m);
  m.fork(y => (expect(y).to.deep.equal(x), done()), failRes);
});

describe('Constructors', () => {

  describe('Future', () => {

    it('is a unary function', () => {
      expect(Future).to.be.a('function');
      expect(Future.length).to.equal(1);
    });

    it('throws TypeError when not given a function', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => Future(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('returns a Future when given a function', () => {
      const actual = Future(noop);
      expect(actual).to.be.an.instanceof(Future);
    });

    it('takes it easy with the recursive data structures', () => {
      const data = {foo: 'bar'};
      data.data = data;
      const f = () => Future(data);
      expect(f).to.throw(TypeError, /Future/);
    });

  });

  describe('.of()', () => {

    it('returns an instance of Future', () => {
      expect(Future.of(1)).to.be.an.instanceof(Future);
    });

    it('treats the value as inner', () => {
      const m = Future.of(1);
      return assertResolved(m, 1);
    });

  });

  describe('.reject()', () => {

    it('returns an instance of Future', () => {
      expect(Future.reject(1)).to.be.an.instanceof(Future);
    });

    it('treats the value as inner', () => {
      const m = Future.reject(1);
      return assertRejected(m, 1);
    });

  });

  describe('.cache()', () => {

    const onceOrError = f => {
      var called = false;
      return function(){
        if(called) throw new Error(`Function ${f} was called twice`);
        called = true;
        f(...arguments);
      }
    };

    it('throws TypeError when not given Future', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null, x => x];
      const fs = xs.map(x => () => Future.cache(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('returns a Future which resolves with the resolution value of the given Future', () => {
      return assertResolved(Future.cache(Future.of(1)), 1);
    });

    it('returns a Future which rejects with the rejection reason of the given Future', () => {
      return assertRejected(Future.cache(Future.reject(error)), error);
    });

    it('only forks its given Future once', () => {
      const m = Future.cache(Future(onceOrError((rej, res) => res(1))));
      m.fork(noop, noop);
      m.fork(noop, noop);
      return assertResolved(m, 1);
    });

    it('throws an error if the given Future resolves or rejects multiple times', () => {
      const ms = [
        Future((rej, res) => (res(1), res(1))),
        Future((rej, res) => (res(1), rej(2))),
        Future((rej) => (rej(2), rej(2))),
        Future((rej, res) => (rej(2), res(1)))
      ];
      const fs = ms.map(m => () => Future.cache(m).fork(noop, noop));
      fs.forEach(f => expect(f).to.throw(Error, /Future/));
    });

    it('resolves all forks once a delayed resolution happens', () => {
      const m = Future.cache(Future.after(20, 1));
      const a = assertResolved(m, 1);
      const b = assertResolved(m, 1);
      const c = assertResolved(m, 1);
      return Promise.all([a, b, c]);
    });

    it('rejects all forks once a delayed rejection happens', () => {
      const m = Future.cache(Future(rej => setTimeout(rej, 20, error)));
      const a = assertRejected(m, error);
      const b = assertRejected(m, error);
      const c = assertRejected(m, error);
      return Promise.all([a, b, c]);
    });

  });

  describe('.try()', () => {

    it('throws TypeError when not given a function', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => Future.try(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('returns a Future which resolves with the return value of the function', () => {
      const actual = Future.try(() => 1);
      return assertResolved(actual, 1);
    });

    it('returns a Future which rejects with the exception thrown by the function', () => {
      const actual = Future.try(() => {
        throw error;
      });
      return assertRejected(actual, error);
    });

  });

  describe('.node()', () => {

    it('throws TypeError when not given a function', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => Future.node(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('returns a Future which rejects when the callback is called with (err)', () => {
      const f = done => done(error);
      return assertRejected(Future.node(f), error);
    });

    it('returns a Future which resolves when the callback is called with (null, a)', () => {
      const f = done => done(null, 'a');
      return assertResolved(Future.node(f), 'a');
    });

  });

  describe('.after()', () => {

    it('is curried', () => {
      expect(Future.after(20)).to.be.a('function');
    });

    it('throws TypeError when not given a number as first argument', () => {
      const xs = [{}, [], 'a', new Date, undefined, null];
      const fs = xs.map(x => () => Future.after(x, 1));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('returns a Future which eventually resolves with the given value', () => {
      const actual = Future.after(20, 1);
      return assertResolved(actual, 1);
    });

  });

  describe('.parallel()', () => {

    it('is curried', () => {
      expect(Future.parallel(1)).to.be.a('function');
    });

    it('throws when given something other than PositiveInteger as a first argument', () => {
      const xs = [0, -1, 1.5, NaN, '1', 'one'];
      const fs = xs.map(x => () => Future.parallel(x, []));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws when given something other than Array as second argument', () => {
      const xs = [NaN, {}, 1, 'a', new Date, undefined, null, Future.of(1)];
      const fs = xs.map(x => () => Future.parallel(1, x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws when the Array contains something other than Futures', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => Future.parallel(1, [x]).fork(noop, noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('parallelizes execution', function(){
      this.slow(80);
      this.timeout(50);
      const actual = Future.parallel(2, [Future.after(35, 'a'), Future.after(35, 'b')]);
      return assertResolved(actual, ['a', 'b']);
    });

    it('limits parallelism to the given number', () => {
      let running = 0;
      const m = Future((rej, res) => {
        running++;
        if(running > 2){
          return rej(new Error('More than two running in parallel'));
        }
        setTimeout(() => {
          running--;
          res('a');
        }, 20);
      });
      const actual = Future.parallel(2, repeat(8, m));
      return assertResolved(actual, repeat(8, 'a'));
    });

    it('runs all in parallel when given number larger than the array length', function(){
      this.slow(80);
      this.timeout(50);
      const actual = Future.parallel(10, [Future.after(35, 'a'), Future.after(35, 'b')]);
      return assertResolved(actual, ['a', 'b']);
    });

    it('resolves to an empty array when given an empty array', () => {
      return assertResolved(Future.parallel(1, []), []);
    });

    it('runs all in parallel when given Infinity', function(){
      this.slow(80);
      this.timeout(50);
      const actual = Future.parallel(Infinity, [Future.after(35, 'a'), Future.after(35, 'b')]);
      return assertResolved(actual, ['a', 'b']);
    });

  });

});

describe('Future', () => {

  describe('#fork()', () => {

    it('throws TypeError when first argument is not a function', () => {
      const m = Future.of(1);
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => m.fork(x, noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws TypeError when second argument is not a function', () => {
      const m = Future.of(1);
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => m.fork(noop, x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('does not throw when both arguments are functions', () => {
      const m = Future.of(1);
      const f = () => m.fork(noop, noop);
      expect(f).to.not.throw(TypeError);
    });

    it('passes rejection value to first argument', () => {
      const m = Future.reject(1);
      m.fork(x => expect(x).to.equal(1), failRes);
    });

    it('passes resolution value to second argument', () => {
      const m = Future.of(1);
      m.fork(failRej, x => expect(x).to.equal(1));
    });

  });

  describe('#chain()', () => {

    const m = Future.of(1);
    const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];

    it('throws TypeError when not given a function', () => {
      const fs = xs.map(x => () => m.chain(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws TypeError when the given function does not return Future', () => {
      const fs = xs.map(x => () => m.chain(() => x).fork(noop, noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('calls the given function with the inner of the Future', () => {
      m.chain(x => (expect(x).to.equal(1), Future.of(null))).fork(noop, noop);
    });

    it('returns a Future with an inner equal to the returned Future', () => {
      const actual = m.chain(() => Future.of(2));
      return assertResolved(actual, 2);
    });

  });

  describe('#chainRej()', () => {

    const m = Future.reject(1);
    const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];

    it('throws TypeError when not given a function', () => {
      const fs = xs.map(x => () => m.chainRej(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws TypeError when the given function does not return Future', () => {
      const fs = xs.map(x => () => m.chainRej(() => x).fork(noop, noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('calls the given function with the inner of the Future', () => {
      m.chainRej(x => (expect(x).to.equal(1), Future.of(null))).fork(noop, noop);
    });

    it('returns a Future with an inner equal to the returned Future', () => {
      const actual = m.chainRej(() => Future.of(2));
      return assertResolved(actual, 2);
    });

  });

  describe('#ap()', () => {

    it('throws TypeError when not given Future', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null, x => x];
      const fs = xs.map(x => () => Future.of(noop).ap(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws TypeError when not not called on Future<Function>', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => Future.of(x).ap(Future.of(1)).fork(noop, noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('applies its inner to the inner of the other', () => {
      const actual = Future.of(add(1)).ap(Future.of(1));
      return assertResolved(actual, 2);
    });

  });

  describe('#map()', () => {

    it('throws TypeError when not given a function', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => Future.of(1).map(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('applies the given function to its inner', () => {
      const actual = Future.of(1).map(add(1));
      return assertResolved(actual, 2);
    });

  });

  describe('#toString()', () => {

    it('returns a string representation', () => {
      const actual = Future(x => x).toString();
      expect(actual).to.equal('Future(x => x)');
    });

  });

  describe('#race()', () => {

    it('throw TypeError when not given a Future', () => {
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null, x => x];
      const fs = xs.map(x => () => Future.of(1).race(x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('returns a Future which rejects when the first one rejects', () => {
      const m1 = Future((rej, res) => setTimeout(res, 15, 1));
      const m2 = Future(rej => setTimeout(rej, 5, error));
      return assertRejected(m1.race(m2), error);
    });

    it('returns a Future which resolves when the first one resolves', () => {
      const m1 = Future((rej, res) => setTimeout(res, 5, 1));
      const m2 = Future(rej => setTimeout(rej, 15, error));
      return assertResolved(m1.race(m2), 1);
    });

  });

  describe('#fold()', () => {

    const add1 = x => x + 1;

    it('throws TypeError when first argument is not a function', () => {
      const m = Future.of(1);
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => m.fold(x, noop));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('throws TypeError when second argument is not a function', () => {
      const m = Future.of(1);
      const xs = [NaN, {}, [], 1, 'a', new Date, undefined, null];
      const fs = xs.map(x => () => m.fold(noop, x));
      fs.forEach(f => expect(f).to.throw(TypeError, /Future/));
    });

    it('resolves with the transformed rejection value', () => {
      return assertResolved(Future.reject(1).fold(add1, add1), 2);
    });

    it('resolves with the transformed resolution value', () => {
      return assertResolved(Future.of(1).fold(add1, add1), 2);
    });

  });

  describe('#value()', () => {

    it('throws when called on a rejected Future', () => {
      const f = () => Future.reject('broken').value(noop);
      expect(f).to.throw(Error, /Future/);
    });

    it('calls the given function with the resolution value', done => {
      Future.of(1).value(x => {
        expect(x).to.equal(1);
        done();
      });
    });

  });

});

describe('Lawfullness', () => {

  describe('Functor', () => {

    it('identity', () => {
      const a = Future.of(1);
      const b = a.map(identity);
      return assertEqual(a, b);
    });

    it('composition', () => {
      const x = Future.of(1);
      const a = x.map(compose(mult(2))(add(1)));
      const b = x.map(add(1)).map(mult(2));
      return assertEqual(a, b);
    });

  });

  describe('Apply', () => {

    it('composition', () => {
      const f = Future.of(mult(2));
      const g = Future.of(add(1));
      const x = Future.of(1);
      const a = f.map(compose).ap(g).ap(x);
      const b = f.ap(g.ap(x));
      return assertEqual(a, b);
    });

  });

  describe('Applicative', () => {

    it('identity', () => {
      const a = Future.of(1);
      const b = Future.of(identity).ap(a);
      return assertEqual(a, b);
    });

    it('homomorphism', () => {
      const f = add(1);
      const x = 1;
      const a = Future.of(f).ap(Future.of(x));
      const b = Future.of(f(x));
      return assertEqual(a, b);
    });

    it('interchange', () => {
      const f = Future.of(add(1));
      const x = 1;
      const a = f.ap(Future.of(x));
      const b = Future.of(g => g(x)).ap(f);
      return assertEqual(a, b);
    });

  });

  describe('Chain', () => {

    it('associativity', () => {
      const x = Future.of(1);
      const f = compose(Future.of)(add(1));
      const g = compose(Future.of)(mult(2));
      const a = x.chain(f).chain(g);
      const b = x.chain(x => f(x).chain(g));
      return assertEqual(a, b);
    });

  });

});

describe('Dispatchers', () => {

  describe('.map()', () => {

    it('is curried', () => {
      expect(Future.map).to.be.a('function');
      expect(Future.map(noop)).to.be.a('function');
    });

    it('dispatches to #map', () => {
      return assertResolved(Future.map(x => x + 1, Future.of(1)), 2);
    });

  });

  describe('.chain()', () => {

    it('is curried', () => {
      expect(Future.chain).to.be.a('function');
      expect(Future.chain(noop)).to.be.a('function');
    });

    it('dispatches to #chain', () => {
      return assertResolved(Future.chain(x => Future.of(x + 1), Future.of(1)), 2);
    });

  });

  describe('.chainRej()', () => {

    it('is curried', () => {
      expect(Future.chainRej).to.be.a('function');
      expect(Future.chainRej(noop)).to.be.a('function');
    });

    it('dispatches to #chainRej', () => {
      return assertResolved(Future.chainRej(x => Future.of(x + 1), Future.reject(1)), 2);
    });

  });

  describe('.ap()', () => {

    it('is curried', () => {
      expect(Future.ap).to.be.a('function');
      expect(Future.ap(Future.of(1))).to.be.a('function');
    });

    it('dispatches to #ap', () => {
      return assertResolved(Future.ap(Future.of(x => x + 1), Future.of(1)), 2);
    });

  });

  describe('.fork()', () => {

    it('is curried', () => {
      expect(Future.fork).to.be.a('function');
      expect(Future.fork(noop)).to.be.a('function');
      expect(Future.fork(noop, noop)).to.be.a('function');
    });

    it('dispatches to #fork', done => {
      Future.fork(done, done.bind(null, null), Future.of(1));
    });

  });

  describe('.race()', () => {

    it('is curried', () => {
      expect(Future.race).to.be.a('function');
      expect(Future.race(Future.of(1))).to.be.a('function');
    });

    it('dispatches to #race', () => {
      return assertResolved(Future.race(Future.of(1), Future.of(2)), 2);
    });

  });

  describe('.fold()', () => {

    it('is curried', () => {
      expect(Future.fold).to.be.a('function');
      expect(Future.fold(noop)).to.be.a('function');
      expect(Future.fold(noop, noop)).to.be.a('function');
    });

    it('dispatches to #fold', () => {
      return assertResolved(Future.fold(x => x + 1, x => x + 1, Future.of(1)), 2);
    });

  });

  describe('.value()', () => {

    it('is curried', () => {
      expect(Future.value).to.be.a('function');
      expect(Future.value(noop)).to.be.a('function');
    });

    it('dispatches to #value', done => {
      Future.value(x => (expect(x).to.equal(1), done()), Future.of(1));
    });

  });

});
