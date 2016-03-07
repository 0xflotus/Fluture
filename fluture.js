/*global define*/
/*global FantasyLand*/
/*global _*/
(function(global, f){

  'use strict';

  /* istanbul ignore else */
  if(typeof module !== 'undefined'){
    module.exports = f(require('fantasy-land'), require('lodash.curry'));
  }

  else if(typeof define === 'function' && define.amd){
    define(['fantasy-land', 'lodash.curry'], f);
  }

  else{
    global.Fluture = f(FantasyLand, _.curry);
  }

}(global || window || this, function(FL, curry){

  'use strict';

  //A toString function to provide a slightly more meaningful representation of values.
  const toString = x =>
    typeof x === 'string'
    ? JSON.stringify(x)
    : Array.isArray(x)
    ? `[${x.map(toString).join(', ')}]`
    : x && (typeof x.toString === 'function')
    ? x.toString === Object.prototype.toString
    ? `{${Object.keys(x).reduce((o, k) => o.concat(`"${k}": ${toString(x[k])}`), []).join(', ')}}`
    : x.toString()
    : String(x);

  function error(message, actual){
    return message + '\n  Actual: ' + actual;
  }

  //Check input to Future.
  function check$Future(fork){
    if(typeof fork !== 'function') throw new TypeError(error(
      'Future expects its argument to be a function',
      toString(fork)
    ));
  }

  //Check input to Future#fork.
  function check$fork$rej(f){
    if(typeof f !== 'function') throw new TypeError(error(
      'Future#fork expects its first argument to be a function',
      toString(f)
    ));
  }

  //Check input to Future#fork.
  function check$fork$res(f){
    if(typeof f !== 'function') throw new TypeError(error(
      'Future#fork expects its second argument to be a function',
      toString(f)
    ));
  }

  //Check input to Future#chain.
  function check$chain(f){
    if(typeof f !== 'function') throw new TypeError(error(
      'Future#chain expects its argument to be a function',
      toString(f)
    ));
  }

  //Check output from the function passed to Future#chain.
  function check$chain$f(m, f, x){
    if(!(m instanceof FutureClass)) throw new TypeError(error(
      'Future#chain expects the function its given to return a Future',
      `${toString(m)}\n  From calling: ${toString(f)}\n  With: ${toString(x)}`
    ));
  }

  //Check input to Future#map.
  function check$map(f){
    if(typeof f !== 'function') throw new TypeError(error(
      'Future#map expects its argument to be a function',
      toString(f)
    ));
  }

  //Check input to Future#ap.
  function check$ap(m){
    if(!(m instanceof FutureClass)) throw new TypeError(error(
      'Future#ap expects its argument to be a Future',
      toString(m)
    ));
  }

  //Check resolution value of the Future on which #ap was called.
  function check$ap$f(f){
    if(typeof f !== 'function') throw new TypeError(error(
      'Future#ap was called on something other than Future<Function>',
      `Future.of(${toString(f)})`
    ));
  }

  //The of method.
  function Future$of(x){
    return new FutureClass(function Future$of$fork(rej, res){
      res(x)
    });
  }

  //Constructor.
  function FutureClass(f){
    this._f = f;
  }

  //A createFuture function which pretends to be Future.
  function Future(f){
    check$Future(f);
    return new FutureClass(f);
  }

  //Give Future a prototype.
  FutureClass.prototype = Future.prototype = {

    _f: null,

    fork: function Future$fork(rej, res){
      check$fork$rej(rej);
      check$fork$res(res);
      this._f(rej, res);
    },

    [FL.of]: Future$of,

    [FL.chain]: function Future$chain(f){
      check$chain(f);
      const _this = this;
      return new FutureClass(function Future$chain$fork(rej, res){
        _this._f(rej, function Future$chain$res(x){
          const m = f(x);
          check$chain$f(m, f, x);
          m._f(rej, res);
        });
      });
    },

    [FL.map]: function Future$map(f){
      check$map(f);
      const _this = this;
      return new FutureClass(function Future$map$fork(rej, res){
        _this._f(rej, function Future$map$res(x){
          res(f(x));
        });
      });
    },

    [FL.ap]: function Future$ap(m){
      check$ap(m);
      const _this = this;
      return new FutureClass(function Future$ap$fork(g, h){
        let _f, _x, ok1, ok2, ko;
        const rej = x => ko || (ko = 1, g(x));
        _this._f(rej, function Future$ap$resThis(f){
          if(!ok2) return void (ok1 = 1, _f = f);
          check$ap$f(f);
          h(f(_x));
        });
        m._f(rej, function Future$ap$resThat(x){
          if(!ok1) return void (ok2 = 1, _x = x)
          check$ap$f(_f);
          h(_f(x));
        });
      });
    },

    toString: function Future$toString(){
      return `Future(${toString(this._f)})`;
    }

  };

  //Expose `of` statically as well.
  Future[FL.of] = Future[FL.of] = Future$of;

  //Expose Future statically for ease of destructuring.
  Future.Future = Future;

  /**
   * Turn a node continuation-passing-style function into a function which returns a Future.
   *
   * Takes a function which uses a node-style callback for continuation and
   * returns a function which returns a Future for continuation.
   *
   * @sig liftNode :: (x..., (a, b -> Void) -> Void) -> x... -> Future[a, b]
   *
   * @param {Function} f The node function to wrap.
   *
   * @return {Function} A function which returns a Future.
   */
  Future.liftNode = function Future$liftNode(f){
    return function Future$liftNode$lifted(){
      const xs = arguments;
      return new FutureClass(function Future$liftNode$fork(rej, res){
        return f(...xs, function Future$liftNode$callback(err, result){
          err ? rej(err) : res(result);
        });
      });
    };
  };

  /**
   * Turn a function which returns a Promise into a function which returns a Future.
   *
   * @sig liftPromise :: (x... -> a) -> x... -> Future[Error, a]
   *
   * @param {Function} f The function to wrap.
   *
   * @return {Function} A function which returns a Future.
   */
  Future.liftPromise = function Future$liftPromise(f){
    return function Future$liftPromise$lifted(){
      const xs = arguments;
      return new FutureClass(function Future$liftPromise$fork(rej, res){
        return f(...xs).then(res, rej);
      });
    };
  };

  //Create a Future which rejects witth the given value.
  Future.reject = function Future$reject(x){
    return new FutureClass(function Future$reject$fork(rej){
      rej(x);
    });
  };

  //Create a Future which resolves after the given time with the given value.
  Future.after = curry(function Future$after(n, x){
    return new FutureClass(function Future$after$fork(rej, res){
      setTimeout(res, n, x);
    })
  });

  //Create a Future which resolves with the return value of the given function,
  //or rejects with the exception thrown by the given function.
  Future.try = function Future$try(f){
    return new FutureClass(function Future$try$fork(rej, res){
      try{
        res(f());
      }
      catch(err){
        rej(err);
      }
    });
  };

  /**
   * Allow one-off wrapping of a function that requires a node-style callback.
   *
   * @sig fromNode :: ((err, a) -> Void) -> Future[Error, a]
   *
   * @param {Function} f The operation expected to eventaully call the callback.
   *
   * @return {[type]} [description]
   */
  Future.node = function Future$node(f){
    return new FutureClass(function Future$node$fork(rej, res){
      f((a, b) => a ? rej(a) : res(b));
    });
  };

  //Export Future factory.
  return Future;

}));
