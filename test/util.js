'use strict';

const expect = require('chai').expect;
const Future = require('../fluture.js');
const Z = require('sanctuary-type-classes');
const AssertionError = require('assert').AssertionError;

exports.STACKSIZE = (function r(){try{return 1 + r()}catch(e){return 1}}());
exports.noop = () => {};
exports.add = a => b => a + b;
exports.bang = s => `${s}!`;
exports.B = f => g => x => f(g(x));
exports.error = new Error('Intentional error for unit testing');

exports.repeat = (n, x) => {
  const out = new Array(n);
  while(n-- > 0){
    out[n] = x;
  }
  return out;
};

exports.failRes = x => {
  throw new Error(`Invalidly entered resolution branch with value ${x}`);
};

exports.failRej = x => {
  throw new Error(`Invalidly entered rejection branch with value ${x}`);
};

exports.assertIsFuture = x => expect(x).to.be.an.instanceof(Future);

exports.assertEqual = (a, b) => {
  const states = ['pending', 'rejected', 'resolved'];
  if(!(a instanceof Future && b instanceof Future)) throw new Error('Both values must be Futures');
  let astate = 0, aval;
  let bstate = 0, bval;
  a.fork(x => {astate = 1; aval = x}, x => {astate = 2, aval = x});
  b.fork(x => {bstate = 1; bval = x}, x => {bstate = 2, bval = x});
  if(astate === 0) throw new Error('First Future passed to assertEqual did not resolve instantly');
  if(bstate === 0) throw new Error('Second Future passed to assertEqual did not resolve instantly');
  if(astate === bstate && Z.equals(aval, bval)) return true;
  throw new Error(`
    ${a.toString()} :: Future({ <${states[astate]}> ${Z.toString(aval)} })
    does not equal:
    ${b.toString()} :: Future({ <${states[bstate]}> ${Z.toString(bval)} })
  `);
};

exports.forkAndGuard = (m, rej, res) => {
  let rejected = false, resolved = false;
  m.fork(e => {
    if(rejected) throw new Error(`${m.toString()} rejected twice with: ${Z.toString(e)}`);
    if(resolved) throw new Error(`${m.toString()} rejected after resolving: ${Z.toString(e)}`);
    rejected = true;
    rej(e);
  }, x => {
    if(rejected) throw new Error(`${m.toString()} resolved twice with: ${Z.toString(x)}`);
    if(resolved) throw new Error(`${m.toString()} resolved after rejecting: ${Z.toString(x)}`);
    resolved = true;
    res(x);
  })
}

exports.assertResolved = (m, x) => new Promise((res, rej) => {
  exports.assertIsFuture(m);
  exports.forkAndGuard(m,
    e => rej(new Error(`Expected the Future to resolve. Instead rejected with: ${Z.toString(e)}`)),
    y => Z.equals(x, y) ? res() : rej(new AssertionError({
      expected: x,
      actual: y,
      message: `Expected the Future to resolve with ${Z.toString(x)}; got: ${Z.toString(y)}`
    }))
  );
});

exports.assertRejected = (m, x) => new Promise((res, rej) => {
  exports.assertIsFuture(m);
  exports.forkAndGuard(m,
    e => Z.equals(x, e) ? res() : rej(new AssertionError({
      expected: x,
      actual: e,
      message: `Expected the Future to reject with ${Z.toString(x)}; got: ${Z.toString(e)}`
    })),
    x => rej(new Error(`Expected the Future to reject. Instead resolved with: ${Z.toString(x)}`))
  );
});

exports.onceOrError = f => {
  var called = false;
  return function(){
    if(called) throw new Error(`Function ${f} was called twice`);
    called = true;
    f.apply(null, arguments);
  }
};
