import {eq, assertStackTrace, error as mockError} from './util';
import {mock} from './futures';
import {namespace, name, version} from '../src/internal/const';
import {nil, cons} from '../src/internal/list';
import {
  error,
  typeError,
  invalidArgument,
  invalidContext,
  invalidFuture,
  crashReport,
  contextToStackTrace
} from '../src/internal/error';

describe('error', function (){

  describe('error', function (){

    it('constructs an Error', function (){
      eq(error('hello'), new Error('hello'));
    });

  });

  describe('typeError', function (){

    it('constructs a TypeError', function (){
      eq(typeError('hello'), new TypeError('hello'));
    });

  });

  describe('invalidArgument', function (){

    it('constructs a TypeError', function (){
      eq(invalidArgument('Test', 1, 'foo', 'bar'), new TypeError(
        'Test expects its second argument to foo\n  Actual: "bar"'
      ));
    });

  });

  describe('invalidContext', function (){

    it('constructs a TypeError', function (){
      eq(invalidContext('Test', 'foo'), new TypeError(
        'Test was invoked outside the context of a Future. You might want ' +
        'to use a dispatcher instead\n  Called on: "foo"'
      ));
    });

  });

  describe('invalidFuture', function (){

    var mockType = function (identifier){
      return {'constructor': {'@@type': identifier}, '@@show': function (){
        return 'mockType("' + identifier + '")';
      }};
    };

    it('creates a TypeError with a computed message', function (){
      var actual = invalidFuture(
        'Deep Thought', 'the answer to be 42', 43,
        '\n  See: https://en.wikipedia.org/wiki/Off-by-one_error'
      );
      eq(actual, new TypeError(
        'Deep Thought expects the answer to be 42.\n  Actual: 43 :: Number\n' +
        '  See: https://en.wikipedia.org/wiki/Off-by-one_error'
      ));
    });

    it('warns us when nothing seems wrong', function (){
      var actual = invalidFuture('Foo', 0, mockType(namespace + '/' + name + '@' + version));
      eq(actual, new TypeError(
        'Foo expects its first argument to be a valid Future.\n' +
        'Nothing seems wrong. Contact the Fluture maintainers.\n' +
        '  Actual: mockType("fluture/Future@4") :: Future'
      ));
    });

    it('Warns us about Futures from other sources', function (){
      var actual = invalidFuture('Foo', 0, mockType('bobs-tinkershop/' + name + '@' + version));
      eq(actual, new TypeError(
        'Foo expects its first argument to be a valid Future.\n' +
        'The Future was not created by fluture. ' +
        'Make sure you transform other Futures to fluture Futures. ' +
        'Got a Future from bobs-tinkershop.\n' +
        '  See: https://github.com/fluture-js/Fluture#casting-futures\n' +
        '  Actual: mockType("bobs-tinkershop/Future@4") :: Future'
      ));
    });

    it('Warns us about Futures from unnamed sources', function (){
      var actual = invalidFuture('Foo', 0, mockType(name));
      eq(actual, new TypeError(
        'Foo expects its first argument to be a valid Future.\n' +
        'The Future was not created by fluture. ' +
        'Make sure you transform other Futures to fluture Futures. ' +
        'Got an unscoped Future.\n' +
        '  See: https://github.com/fluture-js/Fluture#casting-futures\n' +
        '  Actual: mockType("Future") :: Future'
      ));
    });

    it('Warns about older versions', function (){
      var actual = invalidFuture('Foo', 0, mockType(namespace + '/' + name + '@' + (version - 1)));
      eq(actual, new TypeError(
        'Foo expects its first argument to be a valid Future.\n' +
        'The Future was created by an older version of fluture. ' +
        'This means that one of the sources which creates Futures is outdated. ' +
        'Update this source, or transform its created Futures to be compatible.\n' +
        '  See: https://github.com/fluture-js/Fluture#casting-futures\n' +
        '  Actual: mockType("fluture/Future@3") :: Future'
      ));
    });

    it('Warns about newer versions', function (){
      var actual = invalidFuture('Foo', 0, mockType(namespace + '/' + name + '@' + (version + 1)));
      eq(actual, new TypeError(
        'Foo expects its first argument to be a valid Future.\n' +
        'The Future was created by a newer version of fluture. ' +
        'This means that one of the sources which creates Futures is outdated. ' +
        'Update this source, or transform its created Futures to be compatible.\n' +
        '  See: https://github.com/fluture-js/Fluture#casting-futures\n' +
        '  Actual: mockType("fluture/Future@5") :: Future'
      ));
    });

  });

  describe('crashReport', function (){

    it('can deal with any value in the crash property', function (){
      function mock (v){ return {crash: v, future: null, context: nil} }

      var evilValue = {};
      evilValue.__defineGetter__('name', () => { throw new Error });
      evilValue.__defineGetter__('stack', () => { throw new Error });

      eq(crashReport(mock(new Error('test'))) instanceof Error, true);
      eq(crashReport(mock(new TypeError('test'))) instanceof Error, true);
      eq(crashReport(mock('test')) instanceof Error, true);
      eq(crashReport(mock({foo: 'bar'})) instanceof Error, true);
      eq(crashReport(mock(evilValue)) instanceof Error, true);
      eq(crashReport(mock(null)) instanceof Error, true);
      eq(crashReport(mock({crash: null})) instanceof Error, true);
    });

    it('formats a crash report', function (){
      var context = cons({stack: 'hello'}, cons({stack: 'world'}, nil));
      var report = crashReport({
        future: mock,
        crash: mockError,
        context: context,
      });
      eq(report instanceof Error, true);
      eq(report.name, 'Error');
      eq(report.message, 'Error occurred while interpreting a Future:\n\n  Intentional error for unit testing');
      eq(report.reason, mockError);
      eq(report.future, mock);
      assertStackTrace('Error occurred while interpreting a Future:\n\nError: Intentional error for unit testing', report.stack);
    });

  });

  describe('contextToStackTrace', function (){

    it('converts a nested context structure to a stack trace', function (){
      eq(contextToStackTrace(cons({stack: 'hello'}, cons({stack: 'world'}, nil))), 'hello\nworld\n');
    });

  });

});
