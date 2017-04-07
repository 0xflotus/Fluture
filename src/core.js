/*eslint no-param-reassign:0, no-cond-assign:0, no-unmodified-loop-condition:0 */

import Denque from 'denque';

import {show, showf, noop, moop} from './internal/fn';
import {error} from './internal/throw';
import {Next, Done} from './iteration';
import FL from './internal/fl';
import type from 'sanctuary-type-identifiers';

const TYPEOF_FUTURE = 'fluture/Future@2';

const throwRejection = x => error(`Rejected with ${show(x)}`);

export function Future(computation){
  return new Computation(computation);
}

export function isFuture(x){
  return x instanceof Future || type(x) === TYPEOF_FUTURE;
}

Future.prototype[FL.ap] = function Future$FL$ap(other){
  return this.ap(other);
};

Future.prototype[FL.map] = function Future$FL$map(mapper){
  return this.map(mapper);
};

Future.prototype[FL.bimap] = function Future$FL$bimap(lmapper, rmapper){
  return this.bimap(lmapper, rmapper);
};

Future.prototype[FL.chain] = function Future$FL$chain(mapper){
  return this.chain(mapper);
};

Future.prototype.fork = function Future$fork(rej, res){
  return this._fork(rej, res);
};

Future.prototype.value = function Future$value(res){
  return this._fork(throwRejection, res);
};

Future.prototype.promise = function Future$promise(){
  return new Promise((res, rej) => this._fork(rej, res));
};

export function Core(){}

Core.prototype = Object.create(Future.prototype);

Core.prototype.ap = function Core$ap(other){
  return new Sequence(this, [new ApAction(other)]);
};

Core.prototype.map = function Core$map(mapper){
  return new Sequence(this, [new MapAction(mapper)]);
};

Core.prototype.bimap = function Core$bimap(lmapper, rmapper){
  return new Sequence(this, [new BimapAction(lmapper, rmapper)]);
};

Core.prototype.chain = function Core$chain(mapper){
  return new Sequence(this, [new ChainAction(mapper)]);
};

Core.prototype.mapRej = function Core$mapRej(mapper){
  return new Sequence(this, [new MapRejAction(mapper)]);
};

Core.prototype.race = function Core$race(other){
  return new Sequence(this, [new RaceAction(other)]);
};

Core.prototype.both = function Core$both(other){
  return new Sequence(this, [new BothAction(other)]);
};

Core.prototype.or = function Core$or(other){
  return new Sequence(this, [new OrAction(other)]);
};

export const ap = (mx, mf) => mf.ap(mx);
export const map = (f, m) => m.map(f);
export const bimap = (f, g, m) => m.map(f, g);
export const chain = (f, m) => m.chain(f);
export const mapRej = (f, m) => m.mapRej(f);
export const race = (l, r) => l.race(r);
export const or = (l, r) => l.or(r);

export const fork = (rej, res, m) => m._fork(rej, res);
export const value = (res, m) => m.value(res);
export const promise = m => m.promise();

export function Computation(computation){
  this._computation = computation;
}

Computation.prototype = Object.create(Core.prototype);

Computation.prototype._fork = function Computation$_fork(rej, res){
  let open = true;
  const f = this._computation(function Computation$rej(x){
    if(open){
      open = false;
      rej(x);
    }
  }, function Computation$res(x){
    if(open){
      open = false;
      res(x);
    }
  });
  return function Computation$cancel(){
    open && f && f();
    open = false;
  };
};

Computation.prototype.toString = function Computation$toString(){
  return `Future(${showf(this._computation)})`;
};

export function Rejected(value){
  this._value = value;
}

Rejected.prototype = Object.create(Core.prototype);

Rejected.prototype.ap = moop;
Rejected.prototype.map = moop;
Rejected.prototype.chain = moop;
Rejected.prototype.race = moop;
Rejected.prototype.both = moop;

Rejected.prototype.or = function Rejected$or(other){
  return other;
};

Rejected.prototype._fork = function Rejected$_fork(rej){
  rej(this._value);
  return noop;
};

Rejected.prototype.toString = function Rejected$toString(){
  return `Future.reject(${show(this._value)})`;
};

export const reject = x => new Rejected(x);
export const isRejected = m => m instanceof Rejected;

export function Resolved(value){
  this._value = value;
}

Resolved.prototype = Object.create(Core.prototype);

Resolved.prototype.race = moop;
Resolved.prototype.mapRej = moop;
Resolved.prototype.or = moop;

Resolved.prototype.both = function Resolved$both(other){
  return other.map(x => [this._value, x]);
};

Resolved.prototype._fork = function _fork(rej, res){
  res(this._value);
  return noop;
};

Resolved.prototype.toString = function Resolved$toString(){
  return `Future.of(${show(this._value)})`;
};

export const isResolved = m => m instanceof Resolved;
export const of = x => new Resolved(x);

function Never(){}

Never.prototype = Object.create(Future.prototype);

Never.prototype.ap = moop;
Never.prototype.map = moop;
Never.prototype.bimap = moop;
Never.prototype.chain = moop;
Never.prototype.mapRej = moop;
Never.prototype.both = moop;
Never.prototype.or = moop;

Never.prototype.race = function Never$race(other){
  return other;
};

Never.prototype._fork = function Never$_fork(){
  return noop;
};

Never.prototype.toString = function Never$toString(){
  return 'Future.never';
};

export const never = new Never();
export const isNever = x => x === never;

function Eager(future){
  this.rej = noop;
  this.res = noop;
  this.rejected = false;
  this.resolved = false;
  this.value = null;
  this.cancel = future._fork(x => {
    this.value = x;
    this.rejected = true;
    this.cancel = noop;
    this.rej(x);
  }, x => {
    this.value = x;
    this.resolved = true;
    this.cancel = noop;
    this.res(x);
  });
}

Eager.prototype = Object.create(Future.prototype);

Eager.prototype._fork = function Eager$_fork(rej, res){
  if(this.rejected) rej(this.value);
  else if(this.resolved) res(this.value);
  else{
    this.rej = rej;
    this.res = res;
  }
  return this.cancel;
};

export class Action{
  rejected(x){
    return new Rejected(x);
  }
  resolved(x){
    return new Resolved(x);
  }
  run(){
    return this;
  }
  cancel(){}
  toString(){
    return '';
  }
}

export class ApAction extends Action{
  constructor(other){
    super();
    this.other = other;
  }
  resolved(x){
    return this.other.map(f => f(x));
  }
  toString(){
    return `ap(${this.other.toString()})`;
  }
}

export class MapAction extends Action{
  constructor(mapper){
    super();
    this.mapper = mapper;
  }
  resolved(x){
    return new Resolved(this.mapper(x));
  }
  toString(){
    return `map(${showf(this.mapper)})`;
  }
}

export class BimapAction extends Action{
  constructor(lmapper, rmapper){
    super();
    this.lmapper = lmapper;
    this.rmapper = rmapper;
  }
  rejected(x){
    return new Rejected(this.lmapper(x));
  }
  resolved(x){
    return new Resolved(this.rmapper(x));
  }
  toString(){
    return `bimap(${showf(this.lmapper)}, ${showf(this.rmapper)})`;
  }
}

export class ChainAction extends Action{
  constructor(mapper){
    super();
    this.mapper = mapper;
  }
  resolved(x){
    return this.mapper(x);
  }
  toString(){
    return `chain(${showf(this.mapper)})`;
  }
}

export class MapRejAction extends Action{
  constructor(mapper){
    super();
    this.mapper = mapper;
  }
  rejected(x){
    return new Rejected(this.mapper(x));
  }
  toString(){
    return `mapRej(${showf(this.mapper)})`;
  }
}

export class RaceAction extends Action{
  constructor(other){
    super();
    this.other = other;
  }
  run(early){
    return new RaceActionState(early, this.other);
  }
  toString(){
    return `race(${this.other.toString()})`;
  }
}

export class RaceActionState extends RaceAction{
  constructor(early, other){
    super(other);
    this.cancel = other._fork(
      x => early(new Rejected(x)),
      x => early(new Resolved(x))
    );
  }
  rejected(x){
    this.cancel();
    return new Rejected(x);
  }
  resolved(x){
    this.cancel();
    return new Resolved(x);
  }
}

export class BothAction extends Action{
  constructor(other){
    super();
    this.other = other;
  }
  run(early){
    return new BothActionState(early, this.other);
  }
  resolved(x){
    return this.other.map(y => [x, y]);
  }
  toString(){
    return `both(${this.other.toString()})`;
  }
}

export class BothActionState extends BothAction{
  constructor(early, other){
    super(new Eager(other));
    this.cancel = this.other.cancel;
  }
}

export class OrAction extends Action{
  constructor(other){
    super();
    this.other = other;
  }
  run(early){
    return new OrActionState(early, this.other);
  }
  rejected(){
    return this.other;
  }
  toString(){
    return `or(${this.other.toString()})`;
  }
}

export class OrActionState extends OrAction{
  constructor(early, other){
    super(new Eager(other));
    this.cancel = this.other.cancel;
  }
  resolved(x){
    this.cancel();
    return new Resolved(x);
  }
}

const Undetermined = 0;
const Synchronous = 1;
const Asynchronous = 2;

export function Sequence(spawn, actions = []){
  this._spawn = spawn;
  this._actions = actions;
}

Sequence.prototype = Object.create(Future.prototype);

Sequence.prototype._transform = function Sequence$_transform(action){
  return new Sequence(this._spawn, this._actions.concat([action]));
};

Sequence.prototype.ap = function Sequence$ap(other){
  return this._transform(new ApAction(other));
};

Sequence.prototype.map = function Sequence$map(mapper){
  return this._transform(new MapAction(mapper));
};

Sequence.prototype.bimap = function Sequence$bimap(lmapper, rmapper){
  return this._transform(new BimapAction(lmapper, rmapper));
};

Sequence.prototype.chain = function Sequence$chain(mapper){
  return this._transform(new ChainAction(mapper));
};

Sequence.prototype.mapRej = function Sequence$mapRej(mapper){
  return this._transform(new MapRejAction(mapper));
};

Sequence.prototype.race = function Sequence$race(other){
  return isNever(other) ? this : this._transform(new RaceAction(other));
};

Sequence.prototype.both = function Sequence$both(other){
  return this._transform(new BothAction(other));
};

Sequence.prototype.or = function Sequence$or(other){
  return this._transform(new OrAction(other));
};

Sequence.prototype._fork = function Sequence$_fork(rej, res){

  const actions = new Denque(this._actions), queue = new Denque();
  let action, cancel = noop, timing = Undetermined, future = this._spawn, settled;

  function cancelAll(){
    cancel();
    action && action.cancel();
    let running;
    while(running = queue.shift()) running.cancel();
    queue.clear();
    actions.clear();
    cancel = noop;
  }

  function absorb(m){
    future = m;
    settled = true;
    while(future instanceof Sequence){
      for(let i = future._actions.length - 1; i >= 0; i--) actions.unshift(future._actions[i]);
      future = future._spawn;
    }
  }

  function early(m){
    cancelAll();
    absorb(m);
    timing = timing === Undetermined ? Synchronous : drain();
  }

  function rejected(x){
    absorb(action.rejected(x));
    timing = timing === Undetermined ? Synchronous : drain();
  }

  function resolved(x){
    absorb(action.resolved(x));
    timing = timing === Undetermined ? Synchronous : drain();
  }

  function drain(){
    while(action = actions.shift() || queue.shift()){
      settled = false;
      timing = Undetermined;
      cancel = future._fork(rejected, resolved);
      if(settled) continue;
      action = action.run(early);
      if(settled) continue;
      let running;
      const runners = new Denque(actions.length);
      while(!settled && (running = actions.shift())) runners.push(running.run(early));
      if(settled) continue;
      while(running = runners.pop()) queue.unshift(running);
      if(timing !== Synchronous){
        timing = Asynchronous;
        return;
      }
    }
    cancel = future._fork(rej, res);
  }

  drain();

  return cancelAll;

};

Sequence.prototype.toString = function Sequence$toString(){
  return `${this._spawn.toString()}${this._actions.map(x => `.${x.toString()}`).join('')}`;
};

export const chainRec = (step, init) => (function recur(x){
  return step(Next, Done, x).chain(o => o.done ? new Resolved(o.value) : recur(o.value));
}(init));

Future['@@type'] = TYPEOF_FUTURE;
Future[FL.chainRec] = chainRec;
Future[FL.of] = of;
Future[FL.zero] = () => never;
