const prelude = String.raw`
import json as __json
import sys as __sys_rl
__sys_rl.setrecursionlimit(10000)
import typing as __typing
import collections as __collections
class ListNode:
    def __init__(self, val=0, next=None):
        self.val, self.next = val, next
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def __decode(value, kind):
    if kind == 'list':
        if value is None: return None
        if not isinstance(value, list): raise ValueError('A ListNode input must be a JSON array')
        head = None
        for item in reversed(value): head = ListNode(item, head)
        return head
    if kind == 'tree':
        if value is not None and not isinstance(value, list): raise ValueError('A TreeNode input must be a JSON array')
        if not value or value[0] is None: return None
        root = TreeNode(value[0]); queue = [root]; i = 1
        for node in queue:
            for side in ('left','right'):
                if i < len(value) and value[i] is not None:
                    child = TreeNode(value[i]); setattr(node, side, child); queue.append(child)
                i += 1
        return root
    return value

def __safe(v, depth=0):
    if isinstance(v, bool) or v is None or isinstance(v, str): return v
    if isinstance(v, float): return v if v == v and v not in (float('inf'), float('-inf')) else str(v)
    if isinstance(v, int): return v
    if depth > 6: return '[…]'
    if isinstance(v, (list, tuple, set, frozenset, __collections.deque)): return [__safe(x, depth + 1) for x in list(v)[:2000]]
    if isinstance(v, dict): return {str(k): __safe(x, depth + 1) for k, x in list(v.items())[:2000]}
    return repr(v)[:200]

def __encode(value, kind):
    if kind == 'list':
        out, seen = [], set()
        while value is not None:
            if id(value) in seen or len(out) > 10000: raise ValueError('Returned list contains a cycle or is too large.')
            seen.add(id(value)); out.append(value.val); value = value.next
        return out
    if kind == 'tree':
        if value is None: return []
        queue, out, seen = [value], [], set()
        for node in queue:
            if node is None: out.append(None); continue
            if id(node) in seen or len(queue) > 20000: raise ValueError('Returned tree contains a cycle or is too large.')
            seen.add(id(node)); out.append(node.val); queue.extend([node.left, node.right])
        while out and out[-1] is None: out.pop()
        return out
    return value

`;
// Judges every case of a suite; returns a JSON list of {actual} or {error}.
export const pythonJudge =
  prelude +
  String.raw`
__suite = __json.loads(__suite_json)
__results = []
for __case in __suite['cases']:
    try:
        __env = {'ListNode':ListNode,'TreeNode':TreeNode,'__name__':'__candidate__', **vars(__typing)}
        __env.update({name:getattr(__collections,name) for name in ('deque','defaultdict','Counter')})
        exec(__candidate_code, __env)
        __args = [__decode(v,k) for v,k in zip(__json.loads(__json.dumps(__case['input'])), __suite['arguments'])]
        __fn = getattr(__env['Solution'](), __suite['method']) if 'Solution' in __env else __env.get(__suite['method'])
        if not callable(__fn): raise ValueError('Define Solution.' + __suite['method'] + ' using the supplied starter code.')
        __value = __fn(*__args)
        if __suite['output'].startswith('argument:'):
            __i = int(__suite['output'].split(':')[1])
            __value = __encode(__args[__i], __suite['arguments'][__i])
        else:
            __value = __encode(__value, __suite['output'])
        try:
            __json.dumps(__value, allow_nan=False)
        except (TypeError, ValueError) as __e:
            __value = __safe(__value)
        __results.append({'actual': __value})
    except Exception as __error:
        __results.append({'error':str(__error)})
__json.dumps(__results, allow_nan=False)
`;
// Traces one case with sys.settrace, streaming snapshot batches through the JS
// callback __emit, then returns JSON {actual|error, steps}.
export const pythonTracer =
  prelude +
  String.raw`
import sys as __sys
__STEPS = []
__COUNT = [0]
__LIMIT = 2500
__IDS = {}
def __ident(o):
    k = id(o)
    if k not in __IDS: __IDS[k] = len(__IDS) + 1
    return __IDS[k]
def __is_node(o): return hasattr(o, 'val') and hasattr(o, 'next') and not hasattr(o, 'left')
def __is_tnode(o): return hasattr(o, 'val') and hasattr(o, 'left') and hasattr(o, 'right')
def __prim(v):
    if v is None or isinstance(v, (bool, int, float, str)): return v
    return '[…]' if isinstance(v, (list, tuple)) else '{…}'
def __ser(v, snap, depth=0):
    if v is None: return {'t': 'null'}
    if isinstance(v, bool): return {'t': 'bool', 'v': v}
    if isinstance(v, (int, float)): return {'t': 'num', 'v': v if v == v and v not in (float('inf'), float('-inf')) else str(v)}
    if isinstance(v, str): return {'t': 'str', 'v': v}
    if __is_node(v):
        cur, n = v, 0
        while cur is not None and __is_node(cur) and n < 300:
            i = __ident(cur)
            if i in snap['nodes']: break
            snap['nodes'][i] = {'val': __prim(cur.val), 'next': __ident(cur.next) if __is_node(cur.next) else None}
            cur = cur.next; n += 1
        return {'t': 'node', 'id': __ident(v)}
    if __is_tnode(v):
        queue = [v]; i = 0
        while i < len(queue) and i < 200:
            node = queue[i]; i += 1
            k = __ident(node)
            if k in snap['tnodes']: continue
            snap['tnodes'][k] = {'val': __prim(node.val), 'left': __ident(node.left) if __is_tnode(node.left) else None, 'right': __ident(node.right) if __is_tnode(node.right) else None}
            if __is_tnode(node.left): queue.append(node.left)
            if __is_tnode(node.right): queue.append(node.right)
        return {'t': 'tnode', 'id': __ident(v)}
    deeper = (lambda x: __ser(x, snap, depth + 1)) if depth < 2 else (lambda x: {'t': 'more'})
    if isinstance(v, (list, tuple, __collections.deque)): return {'t': 'arr', 'v': [deeper(x) for x in list(v)[:120]], 'n': len(v)}
    if isinstance(v, dict): return {'t': 'map', 'v': [[deeper(k), deeper(x)] for k, x in list(v.items())[:60]], 'n': len(v)}
    if isinstance(v, (set, frozenset)): return {'t': 'set', 'v': [deeper(x) for x in list(v)[:60]], 'n': len(v)}
    if callable(v): return {'t': 'fn', 'v': getattr(v, '__name__', 'fn')}
    if hasattr(v, '__dict__'): return {'t': 'obj', 'v': {k: deeper(x) for k, x in list(vars(v).items())[:40]}}
    return {'t': 'str', 'v': repr(v)[:200]}
def __flush():
    if __STEPS:
        __emit(__json.dumps(__STEPS)); __STEPS.clear()
def __trace(frame, event, arg):
    if frame.f_code.co_filename != '<candidate>': return None
    if event == 'call': return __trace
    if event in ('line', 'return'):
        if __COUNT[0] >= __LIMIT:
            __sys.settrace(None); __flush()
            raise RuntimeError('Debugger stopped after %d steps. Narrow the input or fix the loop.' % __LIMIT)
        __COUNT[0] += 1
        snap = {'line': frame.f_lineno, 'vars': {}, 'nodes': {}, 'tnodes': {}}
        for k, val in list(frame.f_locals.items()):
            if k.startswith('__') or k == 'self': continue
            try: snap['vars'][k] = __ser(val, snap)
            except Exception as e: snap['vars'][k] = {'t': 'str', 'v': '<unserializable>'}
        if event == 'return': snap['ret'] = __ser(arg, snap)
        __STEPS.append(snap)
        if len(__STEPS) >= 25: __flush()
    return __trace

__suite = __json.loads(__suite_json)
__case = __json.loads(__case_json)
__result = {}
try:
    __env = {'ListNode': ListNode, 'TreeNode': TreeNode, '__name__': '__candidate__', **vars(__typing)}
    __env.update({name: getattr(__collections, name) for name in ('deque', 'defaultdict', 'Counter')})
    exec(compile(__candidate_code, '<candidate>', 'exec'), __env)
    __args = [__decode(v, k) for v, k in zip(__json.loads(__json.dumps(__case['input'])), __suite['arguments'])]
    __fn = getattr(__env['Solution'](), __suite['method']) if 'Solution' in __env else __env.get(__suite['method'])
    if not callable(__fn): raise ValueError('Define Solution.' + __suite['method'] + ' using the supplied starter code.')
    __sys.settrace(__trace)
    try:
        __value = __fn(*__args)
    finally:
        __sys.settrace(None)
    if __suite['output'].startswith('argument:'):
        __i = int(__suite['output'].split(':')[1])
        __value = __encode(__args[__i], __suite['arguments'][__i])
    else:
        __value = __encode(__value, __suite['output'])
    try:
        __json.dumps(__value, allow_nan=False)
    except (TypeError, ValueError):
        __value = __safe(__value)
    __result = {'actual': __value, 'steps': __COUNT[0]}
except Exception as __error:
    __result = {'error': str(__error), 'steps': __COUNT[0]}
__flush()
__json.dumps(__result, allow_nan=False)
`;
