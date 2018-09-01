import {Future} from './future';
import {noop, show, showf} from './internal/utils';
import {isThenable, isFunction} from './internal/predicates';
import {typeError} from './internal/error';
import {throwInvalidArgument} from './internal/throw';
import {nil} from './internal/list';
import {captureContext} from './internal/debug';

function invalidPromise(p, f){
  return typeError(
    'Future.tryP expects the function it\'s given to return a Promise/Thenable'
    + '\n  Actual: ' + show(p) + '\n  From calling: ' + showf(f)
  );
}

export function TryP(fn){
  this._fn = fn;
  this.context = captureContext(nil, 'a Future created with tryP', TryP);
}

TryP.prototype = Object.create(Future.prototype);

TryP.prototype._interpret = function TryP$interpret(rec, rej, res){
  var open = true, fn = this._fn, p;
  try{
    p = fn();
  }catch(e){
    rec({crash: e, future: this, context: this.context});
    return noop;
  }
  if(!isThenable(p)){
    rec({crash: invalidPromise(p, fn), future: this, context: this.context});
    return noop;
  }
  p.then(function TryP$res(x){
    if(open){
      open = false;
      res(x);
    }
  }, function TryP$rej(x){
    if(open){
      open = false;
      rej(x);
    }
  });
  return function TryP$cancel(){ open = false };
};

TryP.prototype.toString = function TryP$toString(){
  return 'Future.tryP(' + show(this._fn) + ')';
};

export function tryP(f){
  if(!isFunction(f)) throwInvalidArgument('Future.tryP', 0, 'be a function', f);
  return new TryP(f);
}
