export const pythonJudge = String.raw`
import json as __json
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
        head = None
        for item in reversed(value): head = ListNode(item, head)
        return head
    if kind == 'tree':
        if not value or value[0] is None: return None
        root = TreeNode(value[0]); queue = [root]; i = 1
        for node in queue:
            for side in ('left','right'):
                if i < len(value) and value[i] is not None:
                    child = TreeNode(value[i]); setattr(node, side, child); queue.append(child)
                i += 1
        return root
    return value

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
        __value = __args[int(__suite['output'].split(':')[1])] if __suite['output'].startswith('argument:') else __encode(__value,__suite['output'])
        __results.append({'actual': __value})
    except Exception as __error:
        __results.append({'error':str(__error)})
__json.dumps(__results, allow_nan=False)
`;
