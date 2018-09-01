import {Future} from './future';
import {noop, show, showf, partial1, partial2, partial3} from './internal/utils';
import {isThenable, isFunction} from './internal/predicates';
import {typeError} from './internal/error';
import {throwInvalidArgument} from './internal/throw';
import {nil} from './internal/list';
import {captureContext} from './internal/debug';

function invalidPromise(p, f, a, b, c){
  return typeError(
    'Future.encaseP3 expects the function it\'s given to return a Promise/Thenable'
    + '\n  Actual: ' + (show(p)) + '\n  From calling: ' + (showf(f))
    + '\n  With 1: ' + (show(a))
    + '\n  With 2: ' + (show(b))
    + '\n  With 3: ' + (show(c))
  );
}

export function EncaseP3(fn, a, b, c){
  this._fn = fn;
  this._a = a;
  this._b = b;
  this._c = c;
  this.context = captureContext(nil, 'a Future created with encaseP3', EncaseP3);
}

EncaseP3.prototype = Object.create(Future.prototype);

EncaseP3.prototype._interpret = function EncaseP3$interpret(rec, rej, res){
  var open = true, fn = this._fn, a = this._a, b = this._b, c = this._c, p;
  try{
    p = fn(a, b, c);
  }catch(e){
    rec({crash: e, future: this, context: this.context});
    return noop;
  }
  if(!isThenable(p)){
    rec({crash: invalidPromise(p, fn, a, b, c), future: this, context: this.context});
    return noop;
  }
  p.then(function EncaseP3$res(x){
    if(open){
      open = false;
      res(x);
    }
  }, function EncaseP3$rej(x){
    if(open){
      open = false;
      rej(x);
    }
  });
  return function EncaseP3$cancel(){ open = false };
};

EncaseP3.prototype.toString = function EncaseP3$toString(){
  return 'Future.encaseP3('
       + showf(this._fn)
       + ', '
       + show(this._a)
       + ', '
       + show(this._b)
       + ', '
       + show(this._c)
       + ')';
};

export function encaseP3(f, x, y, z){
  if(!isFunction(f)) throwInvalidArgument('Future.encaseP3', 0, 'be a function', f);

  switch(arguments.length){
    case 1: return partial1(encaseP3, f);
    case 2: return partial2(encaseP3, f, x);
    case 3: return partial3(encaseP3, f, x, y);
    default: return new EncaseP3(f, x, y, z);
  }
}
