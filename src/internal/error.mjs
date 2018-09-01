import {show, indent} from './utils';
import {ordinal, namespace, name, version} from './const';
import type from 'sanctuary-type-identifiers';
import {nil} from './list';

export function error(message){
  return new Error(message);
}

export function typeError(message){
  return new TypeError(message);
}

export function invalidArgument(it, at, expected, actual){
  return typeError(
    it + ' expects its ' + ordinal[at] + ' argument to ' + expected + '\n  Actual: ' + show(actual)
  );
}

export function invalidContext(it, actual){
  return typeError(
    it + ' was invoked outside the context of a Future. You might want to use'
  + ' a dispatcher instead\n  Called on: ' + show(actual)
  );
}

function invalidNamespace(m, x){
  return (
    'The Future was not created by ' + namespace + '. '
  + 'Make sure you transform other Futures to ' + namespace + ' Futures. '
  + 'Got ' + (x ? ('a Future from ' + x) : 'an unscoped Future') + '.'
  + '\n  See: https://github.com/fluture-js/Fluture#casting-futures'
  );
}

function invalidVersion(m, x){
  return (
    'The Future was created by ' + (x < version ? 'an older' : 'a newer')
  + ' version of ' + namespace + '. '
  + 'This means that one of the sources which creates Futures is outdated. '
  + 'Update this source, or transform its created Futures to be compatible.'
  + '\n  See: https://github.com/fluture-js/Fluture#casting-futures'
  );
}

export function invalidFuture(it, at, m, s){
  var id = type.parse(type(m));
  var info = id.name === name ? '\n' + (
    id.namespace !== namespace ? invalidNamespace(m, id.namespace)
  : id.version !== version ? invalidVersion(m, id.version)
  : 'Nothing seems wrong. Contact the Fluture maintainers.') : '';
  return typeError(
    it + ' expects ' + (ordinal[at] ? 'its ' + ordinal[at] + ' argument to be a valid Future' : at)
  + '.' + info + '\n  Actual: ' + show(m) + ' :: ' + id.name + (s || '')
  );
}

export function crashReport(report){
  var name, message, stack;
  try{
    if(report.crash instanceof Error){
      name = report.crash.name;
      message = report.crash.message;
      stack = report.crash.stack;
    }else{
      name = 'Non-Error';
      message = show(report.crash);
    }
  }catch (_){
    name = 'Something';
    message = '<The value which was thrown could not be converted to string>';
  }
  var prefix = name + ' occurred while interpreting a Future:\n\n';
  var e = error(prefix + message.split('\n').map(indent).join('\n'));
  e.reason = report.crash;
  e.future = report.future;
  e.stack = (stack ? (prefix + stack) : e.stack) + '\n' + contextToStackTrace(report.context);
  return e;
}

export function contextToStackTrace(context){
  var stack = '', tail = context;
  while(tail !== nil){
    stack += tail.head.stack + '\n';
    tail = tail.tail;
  }
  return stack;
}
