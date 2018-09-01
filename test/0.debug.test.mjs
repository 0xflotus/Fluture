import {eq, error, assertStackTrace} from './util';
import {debugMode, debug, captureContext, captureStackTraceFallback} from '../src/internal/debug';
import {nil} from '../src/internal/list';

describe('debug', function (){

  beforeEach(function (){
    debugMode(false);
  });

  describe('debug()', function (){

    it('does nothing by default', function (done){
      var x = debug(function (){
        done(error);
      });
      eq(x, undefined);
      done();
    });

    it('runs the given function when debugMode was enabled', function (){
      var guard = {};
      debugMode(true);
      var actual = debug(function (){
        return guard;
      });
      eq(actual, guard);
    });

  });

  describe('captureContext', function (){

    it('returns previous when debugMode is default', function (){
      var previous = {};
      var x = captureContext(previous, 2, 3);
      eq(x, previous);
    });

    it('returns a list with a context object', function (){
      debugMode(true);
      var prev = nil;
      var tag = 'hello world';
      var expectedName = ' from ' + tag + ':';
      var ctx = captureContext(prev, tag);
      eq(typeof ctx, 'object');
      eq(ctx.tail, prev);
      eq(typeof ctx.head, 'object');
      eq(ctx.head.tag, tag);
      eq(ctx.head.name, expectedName);
      assertStackTrace(expectedName, ctx.head.stack);
    });

  });

  describe('captureStackTraceFallback', function (){

    it('assigns a stack trace to the given object', function (){
      var o = {name: 'test'};
      captureStackTraceFallback(o);
      assertStackTrace('test', o.stack);
    });

  });

});
