/* eslint no-param-reassign:0 */

export var nil = {head: null};
nil.tail = nil;

// cons :: (a, List a) -> List a
//      -- O(1) append operation
export function cons(head, tail){
  return {head: head, tail: tail};
}

// reverse :: List a -> List a
//         -- O(n) list reversal
export function reverse(xs){
  var ys = nil, tail = xs;
  while(tail !== nil){
    ys = cons(tail.head, ys);
    tail = tail.tail;
  }
  return ys;
}

// cat :: (List a, List a) -> List a
//     -- O(n) list concatenation
export function cat(xs, ys){
  var zs = ys, tail = reverse(xs);
  while(tail !== nil){
    zs = cons(tail.head, zs);
    tail = tail.tail;
  }
  return zs;
}
