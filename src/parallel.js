import {Core, isRejected, Resolved, isFuture} from './core';
import {typeError} from './internal/throw';
import {show, mapArray} from './internal/fn';

const check$parallel = (m, i) => isFuture(m) ? m : typeError(
  'Future.parallel expects its second argument to be an array of Futures.'
  + ` The value at position ${i} in the array was not a Future\n  Actual: ${show(m)}`
);

export function Parallel(max, futures){
  this._futures = futures;
  this._length = futures.length;
  this._max = Math.min(this._length, max);
}

Parallel.prototype = Object.create(Core.prototype);

Parallel.prototype._fork = function Parallel$_fork(rej, res){

  const {_futures, _length, _max} = this;
  const cancels = new Array(_max), out = new Array(_length);
  let i = _max;

  function Parallel$fork$cancelAll(){
    for(let n = 0; n < _max; n++) cancels[n] && cancels[n]();
  }

  function Parallel$fork$rej(reason){
    Parallel$fork$cancelAll();
    rej(reason);
  }

  function Parallel$fork$run(future, idx, cancelSlot){
    cancels[cancelSlot] = future._fork(Parallel$fork$rej, function Parallel$fork$res(value){
      out[idx] = value;
      if(i < _length) Parallel$fork$run(_futures[i], i++, cancelSlot);
      else if(++i - _max === _length) res(out);
    });
  }

  for(let n = 0; n < _max; n++) Parallel$fork$run(_futures[n], n, n);

  return Parallel$fork$cancelAll;

};

Parallel.prototype.toString = function Parallel$toString(){
  return `Future.parallel(${this._max}, ${show(this._futures)})`;
};

const arrof = x => [x];
const emptyArray = new Resolved([]);

export const parallel = (max, xs) => {
  const futures = mapArray(xs, check$parallel);
  return futures.length === 0
  ? emptyArray
  : futures.length === 1
  ? futures[0].map(arrof)
  : futures.find(isRejected) || new Parallel(max, futures);
};
