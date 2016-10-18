const benchmark = require('benchmark');
const suite = new benchmark.Suite();
const Future = require('..');

const noop = () => {};
const a = Future.of('a');
const b = Future.after(5, 'b');

suite.add('Left winner', () => {
  a.race(b).fork(noop, noop);
});

suite.add('Right winner', () => {
  b.race(a).fork(noop, noop);
});

suite.add('Both fast', () => {
  a.race(a).fork(noop, noop);
});

suite.add('Both slow', () => {
  b.race(b).fork(noop, noop);
});

suite.on('complete', require('./_print'))
suite.run()
