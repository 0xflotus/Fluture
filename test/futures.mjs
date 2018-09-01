import {of, reject, after, rejectAfter} from '../index.mjs';
import {Future, Crashed} from '../src/future';
import {nil} from '../src/internal/list';
import {error} from './util';

export var mock = Object.create(Future.prototype);
mock._interpret = function (){ throw new Error('Override _interpret on mock Future') };
mock.toString = function (){ return '(util.mock)' };

export var resolved = of('resolved');
export var rejected = reject('rejected');
export var resolvedSlow = after(20, 'resolvedSlow');
export var rejectedSlow = rejectAfter(20, 'rejectedSlow');
export var crashed = new Crashed({crash: error, context: nil});
export var crashedSlow = after(20, null).and(crashed);
