import {Future, never} from './core';
import {After} from './after';
import {show, partial1} from './internal/fn';
import {isUnsigned} from './internal/is';
import {invalidArgument} from './internal/throw';

export function RejectAfter(time, value){
  After.call(this, time, value);
}

RejectAfter.prototype = Object.create(After.prototype);

RejectAfter.prototype._fork = function RejectAfter$_fork(rej){
  const id = setTimeout(rej, this._time, this._value);
  return () => { clearTimeout(id) };
};

RejectAfter.prototype.extractLeft = Future.prototype.extractLeft;

RejectAfter.prototype.extractRight = function After$extractRight(){
  return [this._value];
};

RejectAfter.prototype.toString = function RejectAfter$toString(){
  return `Future.rejectAfter(${show(this._time)}, ${show(this._value)})`;
};

function rejectAfter$time(time, reason){
  return time === Infinity ? never : new RejectAfter(time, reason);
}

export function rejectAfter(time, reason){
  if(!isUnsigned(time)) invalidArgument('Future.rejectAfter', 0, 'be a positive integer', time);
  if(arguments.length === 1) return partial1(rejectAfter$time, time);
  return rejectAfter$time(time, reason);
}
